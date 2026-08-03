<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Laravel') }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #1f2937;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: #ffffff;
            border-radius: 12px;
            padding: 48px;
            max-width: 640px;
            width: 100%;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            text-align: center;
        }
        h1 { font-size: 28px; margin: 0 0 8px; color: #0f172a; }
        p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
        code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
        }
        .endpoint { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .endpoint a { color: #0891b2; text-decoration: none; font-weight: 600; }
        .badge {
            display: inline-block;
            background: #ecfdf5;
            color: #047857;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <span class="badge">API ready</span>
        <h1>{{ config('app.name', 'Resume Matchmaker') }}</h1>
        <p>Laravel 12 backend for the Resume Matchmaker API. The REST API is mounted at <code>/api</code>.</p>
        <div class="endpoint">
            <p>Health check: <a href="/api/health">/api/health</a></p>
            <p>API reference: <a href="/docs/API.md">docs/API.md</a></p>
        </div>
    </div>
</body>
</html>
