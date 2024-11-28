import { getBookId, allBookInfos, volumeContents, volumeNumsByBookNum } from './parser.js';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// ** Insert
// * insert Book/Books
async function insertBook(info: any) {
  try {
    // 먼저 Book 레코드 생성
    const book = await prisma.book.create({
      data: info,
    });
    console.log('데이터 생성 성공:', book);
  } catch (error) {
    console.error('데이터 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function insertBooks(infos: any) {
  try {
    // 먼저 Book 레코드 생성
    for (const info of infos) {
      const book = await prisma.book.create({
        data: info,
      });
    }
    console.log('데이터 생성 성공');
  } catch (error) {
    console.error('데이터 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// * insert VolumeContents, BookContents
async function insertVolumeContents(bookNum: number, volumeNum: number) {
  try {
    const contents = volumeContents(bookNum, volumeNum);
    const bookId = getBookId(bookNum);
    const mappedContents = contents.map((content: any) => ({
      ...content,
      book: {
        connect: {
          bookId,
        },
      },
    }));

    // Promise.all을 사용하여 모든 생성 작업을 동시에 처리
    const results = await Promise.all(
      mappedContents.map((content: any) =>
        prisma.content.create({
          data: content,
        })
      )
    );

    console.log(`${results.length}개의 콘텐츠가 생성되었습니다.`);
  } catch (error) {
    console.error('콘텐츠 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const insertBookContents = async (bookNum: number) => {
  const bookId = getBookId(bookNum);
  const volumeNums = volumeNumsByBookNum(bookNum);
  for (const volumeNum of volumeNums) {
    await insertVolumeContents(bookNum, volumeNum);
  }
}


// ** Find
const findBook = async (bookId: string) => {
  const book = await prisma.book.findUnique({
    where: { bookId },
  });
  return book;
}

const findBookContents = async (bookId: string) => {
  const contents = await prisma.content.findMany({
    select: {
      volumeNum: true,
      sectId: true,
      chinese: true,
      korean: true,
    },
    where: { 
      bookId,
      volumeNum: {
        gt: 3,
        lt: 10,
      },
      sectId: {
        gt: 0,
        lt: 5,
      },
    },
    orderBy: {
      // volumeNum: 'asc',
      sectId: 'asc',
    },
  });
  return contents;
}

export { insertBooks, insertBookContents, findBook };

// await insertBooks(allBookInfos())

// await insertVolumeContents(8, 1);

// await insertBookContents(4)

// console.info(JSON.stringify(await findBook('MC_00008'), null, 2));

console.info(JSON.stringify(await findBookContents('MC_00004'), null, 2));
