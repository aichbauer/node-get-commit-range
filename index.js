import execa from 'execa';
import isGit from 'is-git-repository';
import { platform } from 'os';
import makepath from 'path';
import pathIsAbsolute from 'path-is-absolute';
import shellescape from 'shell-escape';

const cwd = process.cwd();

var escapeShell = function(cmd) {
  if(cmd !== undefined){
    var arg = cmd.toString().split(" ");
    return shellescape(arg);
  }
}

const getCommitRange = (options = {}) => {
  const {
    path,
    from,
    to,
    include,
    includeMerges = true,
    short,
    type,
  } = options;
  const commits = [];
  const thisFrom = from || '';
  const thisTo = to || '';
  // cannot use `inclue || true`
  // because if you set include to false
  // it will automatically change to true
  const thisInclude = include === false ? include : true;
  const thisShort = short === true ? short : false;

  let thisPath = path || cwd;
  let getCommits;

  thisPath = pathIsAbsolute(thisPath) ? thisPath : makepath.join(cwd, thisPath);
  
  // escaping bad shell arguments
  thisPath = escapeShell(thisPath);
  thisFrom = escapeShell(thisFrom);
  thisTo = escapeShell(thisTo);

  if (!isGit(thisPath)) {
    return [];
  }

  const format = type === 'text' ? 'B' : 'H';
  const mergeFlag = includeMerges ? '' : '--no-merges';

  try {
    let commitRangeExec;
    if (platform() === 'win32') {
      if (!thisFrom) {
        commitRangeExec = `pushd ${thisPath} & git --no-pager log --format=format:"%${format}{{gitCommitRangeEnd}}" ${mergeFlag}`;
      } else {
        commitRangeExec = `pushd ${thisPath} & git --no-pager log ${thisFrom}...${thisTo} --format=format:"%${format}{{gitCommitRangeEnd}}" ${mergeFlag}`;
      }
    } else {
      if (!thisFrom) { // eslint-disable-line
        commitRangeExec = `(cd ${thisPath} ; git --no-pager log --format=format:"%${format}{{gitCommitRangeEnd}}" ${mergeFlag})`;
      } else {
        commitRangeExec = `(cd ${thisPath} ; git --no-pager log ${thisFrom}...${thisTo} --format=format:"%${format}{{gitCommitRangeEnd}}" ${mergeFlag})`;
      }
    }

    getCommits = execa.shellSync(commitRangeExec).stdout;
    getCommits = getCommits
      .split('{{gitCommitRangeEnd}}')
      .map((s) => s.trim())
      .filter(Boolean);

    getCommits.forEach((commithash) => {
      if (thisShort) {
        return commits.push(commithash.substring(0, 7));
      }

      return commits.push(commithash);
    });

    if (!thisInclude) {
      commits.shift();
      commits.pop();
    }

    return commits;
  } catch (err) {
    return [];
  }
};

export default getCommitRange;
