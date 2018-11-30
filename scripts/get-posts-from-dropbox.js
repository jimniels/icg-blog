require("dotenv").load();
require("isomorphic-fetch");
const path = require("path");
const fs = require("fs-extra");
const Dropbox = require("dropbox").Dropbox;

// Setup our interface for the Dropbox API with our token
// If there's no token, we'll just go ahead and exit this script now.
if (!process.env.DBX_ACCESS_TOKEN) {
  console.log(
    "Error: could not find a Dropbox access token. Make sure you have a `.env` file with a `DBX_ACCESS_TOKEN` key/value pair for accessing the Dropbox API."
  );
  process.exit(1);
}
const dbx = new Dropbox({
  accessToken: process.env.DBX_ACCESS_TOKEN,
  fetch: fetch
});

// Clean anything up that exists already, since we'll be re-building this folder
// everytime we run a build
const POSTS_DIR = path.resolve(__dirname, "../src/_posts");
const IMG_DIR = path.resolve(__dirname, "../src/img");
fs.removeSync(POSTS_DIR);
fs.removeSync(IMG_DIR);
fs.ensureDirSync(POSTS_DIR);
fs.ensureDirSync(IMG_DIR);

// Get all the posts in the root of our our Dropbox App's directory and save
// them all to our local posts folder.

getFolderContentsFromDbx("").then(response => {
  response.entries.forEach(entry => {
    if (entry[".tag"] === "file") {
      downloadFileFromTo({
        src: entry.path_display,
        dest: path.join(POSTS_DIR, entry.path_display)
      });
    } else if (entry[".tag"] === "folder" && entry.path_display === "/_img") {
      getFolderContentsFromDbx("/_img").then(imgResponse => {
        imgResponse.entries.forEach(imgEntry => {
          downloadFileFromTo({
            src: imgEntry.path_display,
            dest: path.join(
              POSTS_DIR,
              "../img",
              path.basename(imgEntry.path_display)
            )
          });
        });
      });
    }
  });
});

function getFolderContentsFromDbx(path) {
  return dbx.filesListFolder({ path }).then(response => response);
}
async function downloadFileFromTo({ src, dest }) {
  try {
    dbx.filesDownload({ path: src }).then(data => {
      fs.outputFile(dest, data.fileBinary);
    });
  } catch (error) {
    console.log("Error: failed to download and write file.", src, dest, error);
  }
}
