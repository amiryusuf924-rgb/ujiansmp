import test from 'node:test';
import assert from 'node:assert/strict';
import { REGISTERED_TEACHERS } from './teacherData.ts';

test('teacher account for Amir Yusuf exists with email and password', () => {
  const amir = REGISTERED_TEACHERS.find(
    (teacher) => teacher.email?.toLowerCase() === 'amir77@gmail.com'
  );

  assert.ok(amir, 'Akun guru Amir Yusuf harus tersedia.');
  assert.equal(amir?.name, 'Amir Yusuf S.Kom');
  assert.equal(amir?.password, '123');
});
