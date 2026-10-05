import { prisma } from '../../src/lib/prisma';

async function main() {
  const drop = await prisma.drop.findFirst({
    where: { title: { contains: 'Akihabara' } },
  });

  if (!drop) {
    console.error('Akihabara drop not found in DB');
    return;
  }

  const url = `http://localhost:3001/drop/${drop.id}`;
  console.log('Testing URL:', url);

  const res = await fetch(url);
  console.log('Response Status:', res.status);

  const text = await res.text();
  console.log('Contains Title:', text.includes('Akihabara'));
  console.log('Contains Sony A7R V:', text.includes('Sony A7R V'));
  console.log('Contains Tokyo Photography:', text.includes('Tokyo Photography'));
}

main().finally(() => prisma.$disconnect());
