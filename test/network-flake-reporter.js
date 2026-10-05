// Gate reporter: retries в playwright.config.js съществуват САМО заради мрежови прекъсвания
// (Chromium net::ERR_NETWORK_CHANGED при смяна на мрежата по време на дългия run).
// Тест, който пада и после минава на retry по ДРУГА причина (race condition, timing бъг),
// е истински сигнал — този reporter го връща като червен exit code вместо да го скрие.

const NETWORK_FLAKE = /net::ERR_(NETWORK_CHANGED|INTERNET_DISCONNECTED|NETWORK_IO_SUSPENDED)/;

function isNetworkFailure(result) {
  const errors = result.errors?.length ? result.errors : (result.error ? [result.error] : []);
  return errors.length > 0 && errors.every(e => NETWORK_FLAKE.test(`${e.message || ''}\n${e.stack || ''}`));
}

export default class NetworkFlakeReporter {
  constructor() {
    this.nonNetworkFlaky = new Map();
  }

  onTestEnd(test) {
    if (test.outcome() !== 'flaky') return;
    const failed = test.results.filter(r => r.status !== 'passed' && r.status !== 'skipped');
    if (failed.every(isNetworkFailure)) return;
    this.nonNetworkFlaky.set(test.id, test.titlePath().filter(Boolean).join(' › '));
  }

  onEnd(result) {
    if (this.nonNetworkFlaky.size === 0) return;
    console.log(`\n✖ ${this.nonNetworkFlaky.size} flaky test(s) failed for a non-network reason (retry hides real bugs):`);
    for (const title of this.nonNetworkFlaky.values()) console.log(`  - ${title}`);
    if (result.status === 'passed') return { status: 'failed' };
  }

  printsToStdio() {
    return false;
  }
}
