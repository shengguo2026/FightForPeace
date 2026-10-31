import { SIM_HZ } from '../src/index';

test('simulation rate is 60 Hz', () => {
  expect(SIM_HZ).toBe(60);
});
