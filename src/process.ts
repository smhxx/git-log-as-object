import { spawn, spawnSync } from 'child_process';

export function wrapGitProcess(args: string[], cwd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('git', args, { cwd });
    let stdout = new Buffer('');
    let stderr = new Buffer('');
    child.stdout.on('data', data => stdout = Buffer.concat([stdout, data as Buffer]));
    child.stderr.on('data', data => stderr = Buffer.concat([stderr, data as Buffer]));
    child.once('close', (code: number) => {
      if (code !== 0 || stderr.toString() !== '') {
        reject(getErrorWithCode(code, stderr.toString()));
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

export function wrapGitProcessSync(args: string[], cwd: string): string {
  const child = spawnSync('git', args, { cwd });

  if (child.status !== 0) {
    throw getErrorWithCode(child.status, child.stderr.toString());
  }

  return child.stdout.toString();
}

function getErrorWithCode(code: number | null, message: string) {
  type ErrorWithCode = Error & { code: number | null };
  const err = new Error(message) as ErrorWithCode;
  err.code = code;
  return err;
}
