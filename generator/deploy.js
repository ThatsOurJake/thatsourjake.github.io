const { simpleGit } = require('simple-git');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const BRANCH_NAME = 'blog';

const runScript = (script) => new Promise((resolve, reject) => {
  let finished = false;

  const proc = fork(script);

  proc.on('error', (err) => {
    if (finished) {
      return;
    }

    finished = true;

    return reject(err);
  });

  proc.on('exit', (code) => {
    if (finished) {
      return;
    }

    finished = true;

    if (code > 0) {
      return reject(new Error(`Error code: ${code}`));
    }

    return resolve();
  });
});

(async() => {
  console.log(`🐳 Deploying Blog`);

  const git = simpleGit();

  if ((await git.branch()).current === BRANCH_NAME) {
    console.error(`❌ Currently checked out on the blog branch, please return to main`);
    return;
  }

  await git.fetch();

  // Check if the current git is clean
  const currentStatus = await git.status();
  if (!currentStatus.isClean()) {
    console.log(`❌ Current Branch is not clean - aborting!`)
    return;
  }

  console.log(`✅ Branch is clean`);

  await runScript(path.join(__dirname, 'builder.js'));

  try {
    await git.checkout([BRANCH_NAME]);
  } catch (err) {
    await git.checkoutLocalBranch(BRANCH_NAME);
  }

  console.log('Switched to "blog" branch');
  console.log('');

  try {
    await git.pull(['origin', BRANCH_NAME]);
  } catch(_) {}

  console.log('Removing all files and folders other than docs');
  const all = fs.readdirSync(process.cwd());
  const gitIgnore = fs.readFileSync(path.resolve('.gitignore')).toString().split('\n');

  for (let i = 0; i < all.length; i++) {
    const f = all[i];

    if (f === 'docs' || gitIgnore.includes(f) || '.git') {
      continue;
    }

    fs.rmSync(f, {
      recursive: true,
      force: true,
    });
  }

  const outputDocs = path.join(process.cwd(), 'docs');

  fs.rmSync(outputDocs, {
    force: true,
    recursive: true,
  });

  console.log('Removing old docs folder');

  fs.cpSync(path.resolve('build', 'docs'), outputDocs, {
    force: true,
    recursive: true,
  });

  console.log(`Copied to ${outputDocs}`);

  await git.add('docs/*');
  await git.commit(`Docs deployment: ${new Date().toISOString()}`);

  console.log('New blog committed');

  try {
    await git.push();
  } catch(_) {
    await git.push(['--set-upstream', 'origin', BRANCH_NAME]);
  }

  console.log('Cleaning up');
  fs.rmSync(outputDocs, {
    force: true,
    recursive: true,
  });

  await git.checkout('main');

  console.log(`✨ Deployed to github`);
})();
