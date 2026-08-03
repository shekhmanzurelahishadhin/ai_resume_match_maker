// Notification triggers — wires domain events (resume parsed, new job,
// new match) into the notification service.
//
// Every function here is fire-and-forget: callers wrap them in `after()` so
// they run after the HTTP response is flushed and never block the request.
//
// Per spec §7 the rules are:
//   - Resume analysis complete  → notify seeker (if `resumeAnalysis` pref on)
//   - New job posted           → notify all seekers with `newJobs` pref on
//   - New match (≥70%)         → notify seeker + recruiter (if `jobMatches` pref on)

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";

const MATCH_THRESHOLD_PCT = 70;

/**
 * Notify the seeker that their resume has been parsed + analysed.
 * Called from `parseResumeAndMatch` after the resume row is updated to
 * `status='ready'`.
 */
export async function notifyResumeAnalysisComplete(resumeId: string): Promise<void> {
  const resume = await db.resume.findUnique({
    where: { id: resumeId },
    select: {
      id: true,
      userId: true,
      fileName: true,
      status: true,
      parseError: true,
    },
  });
  if (!resume) return;

  if (resume.status === "ready") {
    await createNotification({
      userId: resume.userId,
      type: "resume_analysis",
      title: "Resume analysis complete",
      body: `Your resume "${resume.fileName}" has been parsed and matched against active jobs.`,
      data: {
        resumeId: resume.id,
        url: `/dashboard/seeker/resumes/${resume.id}`,
      },
    });
  } else if (resume.status === "failed") {
    await createNotification({
      userId: resume.userId,
      type: "resume_analysis",
      title: "Resume analysis failed",
      body: `We couldn't parse "${resume.fileName}". ${resume.parseError ?? "Unknown error"}. Try re-uploading a text-based PDF.`,
      data: {
        resumeId: resume.id,
        url: `/dashboard/seeker/resumes/${resume.id}`,
      },
    });
  }
}

/**
 * Notify every seeker with `newJobs=true` that a new job has been posted.
 * Called from POST /api/jobs after the job is created and matching has run.
 *
 * Seekers with `emailNotifications=false` AND `pushNotifications=false` are
 * still sent a notification row (the centre shows it) — the prefs only gate
 * the *delivery channels*, not the persistence. The `newJobs` pref itself
 * gates both persistence and delivery.
 */
export async function notifySeekersOfNewJob(jobId: string): Promise<void> {
  const job = await db.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, recruiterId: true },
  });
  if (!job) return;

  const seekers = await db.notificationPreference.findMany({
    where: {
      newJobs: true,
      user: { role: "seeker" },
    },
    select: { userId: true },
  });

  if (seekers.length === 0) return;

  // Issue notifications in parallel but cap concurrency to 8 to avoid
  // hammering FCM + the DB when many seekers are subscribed.
  const BATCH = 8;
  for (let i = 0; i < seekers.length; i += BATCH) {
    const slice = seekers.slice(i, i + BATCH);
    await Promise.all(
      slice.map((s) =>
        createNotification({
          userId: s.userId,
          type: "new_job",
          title: `New job: ${job.title}`,
          body: `A new job matching your profile may have been posted: "${job.title}".`,
          data: {
            jobId: job.id,
            url: `/dashboard/seeker/matches`,
          },
        }),
      ),
    );
  }
}

/**
 * Notify both the seeker and the recruiter when a high-quality match is
 * created. Called from `matchResumeAgainstAllJobs` and
 * `matchJobAgainstAllResumes` (only for matches with `matchPercentage >= 70`).
 *
 * The `jobMatches` pref gates each user independently — the seeker's pref
 * controls their notification, the recruiter's pref controls theirs.
 */
export async function notifyNewMatch(matchId: string): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      matchPercentage: true,
      resumeId: true,
      jobPostId: true,
      recruiterId: true,
      resume: { select: { userId: true } },
      jobPost: { select: { title: true } },
    },
  });
  if (!match) return;

  const pct = Math.round(match.matchPercentage);
  if (pct < MATCH_THRESHOLD_PCT) return;

  const jobTitle = match.jobPost.title;
  const matchPctStr = `${pct}%`;

  // Seeker side.
  await createNotification({
    userId: match.resume.userId,
    type: "job_match",
    title: `New job match (${matchPctStr}) for ${jobTitle}`,
    body: `A new job matches your resume at ${matchPctStr}. Check it out!`,
    data: {
      matchId: match.id,
      resumeId: match.resumeId,
      jobId: match.jobPostId,
      url: `/dashboard/seeker/resumes/${match.resumeId}`,
    },
  }).catch((e) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "notify_match_seeker_failed",
        matchId,
        error: e instanceof Error ? e.message : String(e),
      }),
    ),
  );

  // Recruiter side.
  await createNotification({
    userId: match.recruiterId,
    type: "job_match",
    title: `New candidate match (${matchPctStr}) for ${jobTitle}`,
    body: `A new candidate matches your job "${jobTitle}" at ${matchPctStr}.`,
    data: {
      matchId: match.id,
      resumeId: match.resumeId,
      jobId: match.jobPostId,
      url: `/dashboard/recruiter/jobs/${match.jobPostId}`,
    },
  }).catch((e) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "notify_match_recruiter_failed",
        matchId,
        error: e instanceof Error ? e.message : String(e),
      }),
    ),
  );
}
