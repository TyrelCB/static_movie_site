# static_movie_site

Deploying a single HTML file as a static site on GitHub Pages and/or Netlify is straightforward. Here’s a step-by-step guide:

### Step 1: Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository for your project.
2. Name your repository and make it public or private as you prefer.
3. Add a [`README.md`](command:_github.copilot.openRelativePath?%5B%7B%22scheme%22%3A%22file%22%2C%22authority%22%3A%22%22%2C%22path%22%3A%22%2Fhome%2Ftyrel%2Fstatic_movie_site%2FREADME.md%22%2C%22query%22%3A%22%22%2C%22fragment%22%3A%22%22%7D%2C%2299a36f26-1959-4b23-b948-6ef156742f4d%22%5D "/home/tyrel/static_movie_site/README.md") if you want (optional) and create the repository.

### Step 2: Add the HTML File
1. On your local machine, create a new folder for your project.
2. Inside this folder, create an [`index.html`](command:_github.copilot.openRelativePath?%5B%7B%22scheme%22%3A%22file%22%2C%22authority%22%3A%22%22%2C%22path%22%3A%22%2Fhome%2Ftyrel%2Fstatic_movie_site%2Findex.html%22%2C%22query%22%3A%22%22%2C%22fragment%22%3A%22%22%7D%2C%2299a36f26-1959-4b23-b948-6ef156742f4d%22%5D "/home/tyrel/static_movie_site/index.html") file with your HTML content.
3. Initialize Git in this folder, add the file, and commit:
   ```bash
   git init
   git add index.html
   git commit -m "Initial commit with HTML file"
   ```
4. Link this folder to the GitHub repository you just created:
   ```bash
   git remote add origin https://github.com/your-username/your-repo-name.git
   git push -u origin main
   ```

### Step 3: Deploy on GitHub Pages
1. Ensure you have a [`.github/workflows/static.yml`](command:_github.copilot.openRelativePath?%5B%7B%22scheme%22%3A%22file%22%2C%22authority%22%3A%22%22%2C%22path%22%3A%22%2Fhome%2Ftyrel%2Fstatic_movie_site%2F.github%2Fworkflows%2Fstatic.yml%22%2C%22query%22%3A%22%22%2C%22fragment%22%3A%22%22%7D%2C%2299a36f26-1959-4b23-b948-6ef156742f4d%22%5D "/home/tyrel/static_movie_site/.github/workflows/static.yml") file in your repository with the following content:
   ```yml
   # Simple workflow for deploying static content to GitHub Pages
   name: Deploy static content to Pages
   on:
     # Runs on pushes targeting the default branch
     push:
       branches: ["main"]
     # Allows you to run this workflow manually from the Actions tab
     workflow_dispatch:
   # Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
   permissions:
     contents: read
     pages: write
     id-token: write
   # Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
   # However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
   concurrency:
     group: "pages"
     cancel-in-progress: false
   jobs:
     # Single deploy job since we're just deploying
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Setup Pages
           uses: actions/configure-pages@v5
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             # Upload entire repository
             path: '.'
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```

2. Commit and push the [`.github/workflows/static.yml`](command:_github.copilot.openRelativePath?%5B%7B%22scheme%22%3A%22file%22%2C%22authority%22%3A%22%22%2C%22path%22%3A%22%2Fhome%2Ftyrel%2Fstatic_movie_site%2F.github%2Fworkflows%2Fstatic.yml%22%2C%22query%22%3A%22%22%2C%22fragment%22%3A%22%22%7D%2C%2299a36f26-1959-4b23-b948-6ef156742f4d%22%5D "/home/tyrel/static_movie_site/.github/workflows/static.yml") file to your repository:
   ```bash
   git add .github/workflows/static.yml
   git commit -m "Add GitHub Pages deployment workflow"
   git push origin main
   ```

### Step 4: Access Your Site (Github Pages)
Once the workflow completes, your site will be deployed to GitHub Pages. You can access it at `https://your-username.github.io/your-repo-name/`. You can customize this URL in the **Repository settings** under **Pages** if desired.

Your static site with a single HTML file is now live on GitHub Pages!


### Step 5: Deploy on Netlify
1. Go to [Netlify](https://www.netlify.com/) and sign in or create an account.
2. In your Netlify dashboard, click on **"Add new site"** and choose **"Import an existing project"**.
3. Select **GitHub** as the source and authorize Netlify to access your repositories.
4. Find and select the repository you created with the HTML file.
5. Configure the build settings:
   - **Build Command**: Leave blank (Netlify will detect no build command is necessary).
   - **Publish Directory**: Leave it as the root directory (`/`).
6. Click **Deploy Site**.

### Step 6: Access Your Site (Netlify)
Once deployed, Netlify will give you a URL for your site, and it should be live within seconds. You can customize this URL in the **Site settings** if desired. 

Your static site with a single HTML file is now live on Netlify!