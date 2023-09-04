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

  console.log('');
  // add docs folder
  console.log(`Copying docs from build`)
  const tempDir = path.resolve('temp');
  fs.rmSync(tempDir, {
    recursive: true,
    force: true,
  });

  const outputDocs = path.join(process.cwd(), 'docs');
  fs.cpSync(path.resolve('build', 'docs'), outputDocs, {
    force: true,
    recursive: true,
  });

  console.log(`Copied to ${outputDocs}`);

  await git.add('docs/*');
  const stashed = await git.stash();
  console.log(stashed);

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

   // checkout to branch
   try {
    await git.checkout([BRANCH_NAME]);
  } catch (err) {
    await git.checkoutLocalBranch(BRANCH_NAME);
  }

  try {
    await git.pull('origin', BRANCH_NAME);
  } catch (error) {
    console.warn(`  Branch doesn't exist on remote`);
  }

  console.log('Switched to "blog" branch');
  console.log('');

  await git.stash(['apply', '0']);

  await git.add('docs/*');
  await git.commit(`Docs deployment: ${new Date().toISOString()}`);

  // git push
  await git.push();

  console.log('Cleaning up');
  fs.rmSync(outputDocs, {
    force: true,
    recursive: true,
  });

  await git.checkout('main');

  console.log(`✨ Deployed to github`);
})();
