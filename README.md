# static_movie_site

Deploying a single HTML file as a static site on Netlify is straightforward. Here’s a step-by-step guide:

### Step 1: Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository for your project.
2. Name your repository and make it public or private as you prefer.
3. Add a `README.md` if you want (optional) and create the repository.

### Step 2: Add the HTML File
1. On your local machine, create a new folder for your project.
2. Inside this folder, create an `index.html` file with your HTML content.
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

### Step 3: Deploy on Netlify
1. Go to [Netlify](https://www.netlify.com/) and sign in or create an account.
2. In your Netlify dashboard, click on **"Add new site"** and choose **"Import an existing project"**.
3. Select **GitHub** as the source and authorize Netlify to access your repositories.
4. Find and select the repository you created with the HTML file.
5. Configure the build settings:
   - **Build Command**: Leave blank (Netlify will detect no build command is necessary).
   - **Publish Directory**: Leave it as the root directory (`/`).
6. Click **Deploy Site**.

### Step 4: Access Your Site
Once deployed, Netlify will give you a URL for your site, and it should be live within seconds. You can customize this URL in the **Site settings** if desired. 

Your static site with a single HTML file is now live on Netlify!