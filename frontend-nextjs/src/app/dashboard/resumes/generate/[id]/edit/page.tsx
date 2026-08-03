// edit/page.tsx — alias for the [id] edit page.
// (Some users navigate here directly via the spec; this just re-exports the same UI.)

import EditGeneratedResumePage from "../page";

export default function EditAliasPage(props: { params: Promise<{ id: string }> }) {
  return <EditGeneratedResumePage {...props} />;
}
