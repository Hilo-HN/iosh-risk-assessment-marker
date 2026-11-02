# IOSH Risk Assessment Marker — Webpage Version

This is a normal browser-based website. Users do **not** install Python, Streamlit, or a Windows application.

## What the webpage does
- Upload PDF or DOCX.
- Extract the file text in the browser.
- Send only the extracted assessment text to the secure server-side API route.
- Apply the exact IOSH 5×5 matrix and 38-mark marking method defined by the trainer.
- Give criterion-by-criterion reasons.
- Require hazardous event/exposure + consequence in "How might people be harmed?".
- Check initial and residual likelihood/consequence separately.
- Check deadlines in "Action/monitored by when?".
- Save trainer corrections ("Reviewer learning") in the user's browser.

## Online deployment with Vercel

1. Create a free Vercel account.
2. Create a new GitHub repository and upload this project, or use Vercel's project import.
3. Import the repository into Vercel.
4. In Vercel project settings → Environment Variables, create:
   - `OPENAI_API_KEY` = your OpenAI API key
   - optional: `OPENAI_MODEL` = `gpt-6.1-sol`
5. Deploy.
6. Vercel will give you a normal HTTPS website address.

Users visiting the website never need to see or enter your API key.

## Important security point
Do not put an OpenAI API key in `public/app.js`, `index.html`, or any browser-visible file. This project keeps the key only in the server-side Vercel environment.

## File support
- Searchable PDF
- DOCX
- Image-only scanned PDFs may not extract correctly. Convert them to searchable/OCR PDFs first.

## Reviewer learning
Custom trainer rules are stored in the browser's localStorage. That means:
- they persist on that browser/device;
- they do not retrain the OpenAI model;
- they are visible and removable;
- different devices will have separate saved rules unless you later add a database/login system.

## Current OpenAI implementation
The server route uses OpenAI's Responses API.
