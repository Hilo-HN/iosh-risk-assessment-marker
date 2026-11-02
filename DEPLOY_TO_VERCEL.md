# Simple deployment steps

## Easiest path: Vercel + GitHub

1. Go to GitHub and create a repository named `iosh-risk-assessment-marker`.
2. Upload all files/folders from this project.
3. Go to Vercel and choose **Add New → Project**.
4. Import the GitHub repository.
5. In **Environment Variables**, add:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI API key
6. Optional:
   - Name: `OPENAI_MODEL`
   - Value: `gpt-6.1-sol`
7. Click **Deploy**.
8. Open the HTTPS address Vercel provides.

That address is your webpage. It can be opened from Windows 11, Android, iPhone, Mac, or any other modern browser.

## No Windows installation is needed
After deployment, the user simply visits the URL and uploads the PDF/DOCX.
