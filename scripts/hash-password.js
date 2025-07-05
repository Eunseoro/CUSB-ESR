// 관리자 비밀번호 해시화 스크립트
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log('해시된 비밀번호:', hashedPassword);
  console.log('\n.env 파일에서 ADMIN_PASSWORD를 위 값으로 변경하세요.');
}

// 명령행 인수로 비밀번호 받기
const password = process.argv[2];
if (!password) {
  console.error('사용법: node scripts/hash-password.js <비밀번호>');
  process.exit(1);
}

hashPassword(password).catch(console.error); 