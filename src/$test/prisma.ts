import { allBookInfos } from '../parser.js';
import { loadJson } from 'jnj-utils';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// console.log(loadJson('../../_data/json/allBookInfos.json'));

// const bookInfos = loadJson('../../_data/json/allBookInfos.json');

const info = {
  id: 'MC_00115', // bookId를 book.id로 연결
  bookNum: 115,
  title: '검요',
  volumes: 2,
  chars: 43086,
  source: 'mediclassics',
  titleChinese: '檢要',
  author: '미상 (未詳)',
  publishYear: '미상',
  translator: '안상우, 이연희, 전혜경',
  edition: '필사본',
  language: '한문',
  physicalInfo: '2권 2책',
  ebooks: '',
  abstract:
    '▶ \n檢要 上\n\n⦁ 編次 ⦁ 仰面脈錄 ⦁ 合面脈錄 ⦁ 法文 ⦁ 字訓 ⦁ 被刺致死⦁ 被踢致死⦁ 被踢內損致死 ⦁ 折肋致死 ⦁ 折項致死 ⦁ 被擠致死 ⦁ 被壓致死 ⦁ 被打致死 ⦁ 各招 ⦁ 被打後病患致死 ⦁ 揮擲後病患致死 ⦁ 飮滷致死 ⦁ 服砒礵致死 ⦁ 自縊致死 ⦁ 被打後自縊致死 ⦁ 一獄兩檢 ▶ 檢要 下⦁ 自溺致死 ⦁ 因病致死⦁ 醉後中風卒死⦁ 氣窒致死⦁ 飢餓中因鬪氣窒死 ⦁ 會査 ⦁ 未檢撿査報⦁ 正犯 ⦁ 干犯 ⦁ 被告 ⦁ 干連 ⦁ 屍親臚列 ⦁ 嫌格 ⦁ 尊位 ⦁ 結辭<간략해제>희귀성이 단연 돋보이는 법의학서로 19세기의 ‘살인사건 수사 실례집’, ‘검험문안(檢驗文案) 작성의 참고서’라 할 수 있다. 특히, 다산 정약용이 지은 󰡔흠흠신서(欽欽新書)󰡕가 여러 차례 인용되어 있어, 많은 영향을 받았다. 조선시대 법의학 전문서로는 󰡔심이록(審理錄)󰡕, 󰡔흠흠신서(欽欽新書)󰡕, 󰡔신주무원록(新註無寃錄)󰡕, 󰡔증수무원록(增修無冤錄)󰡕, 󰡔증수무원록언해(增修無冤錄諺解)󰡕 등이 있으나, 검험 실무서로 실인(實因)을 중심으로 편성한 사례집은 이 책이 유일하다. 19세기 초중반 법의학(法醫學)의 현장 응용상황을 살펴볼 수 있으며, 근거주의에 기반한 조선 검안의 모습을 여실히 보여준다는 면이 주목된다.',
  translatorInfo:
    '상권 : 안상우, 이연희, 전혜경\n하권 : 안상우, 이연희, 전혜경',
  category: '분과 - 임상기타',
  similars: '147,260,119,130,42,151,112,100',
};

async function createBook() {
  try {
    // 먼저 Book 레코드 생성
    const book = await prisma.book.create({
      data: {
        bookId: 'MC_00115',
        bookNum: 115,
        title: '검요',
        volumes: 2,
        chars: 43086,
        source: 'mediclassics',
        titleChinese: '檢要',
        author: '미상 (未詳)',
        publishYear: '미상',
        translator: '안상우, 이연희, 전혜경',
        edition: '필사본',
        language: '한문',
        physicalInfo: '2권 2책',
        ebooks: '',
        abstract: info.abstract,
        translatorInfo: info.translatorInfo,
        category: '분과 - 임상기타',
        similars: '147,260,119,130,42,151,112,100',
      },
    });

    console.log('데이터 생성 성공:', book);
  } catch (error) {
    console.error('데이터 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createContent() {
  try {
    const contents = loadJson('../../_data/json/8_1.json');
    const mappedContents = contents.map((content: any) => ({
      ...content,
      book: {
        connect: {
          bookId: 'MC_00115',
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

const bookId = 'MC_00115';

const contents = await prisma.content.findMany({
  where: {
    bookId: bookId,
    sectId: {
      gte: 50,
      lt: 60,
    },
  },
  orderBy: {
    sectId: 'asc',
  },
});

console.log(contents);

// await createBook();

// await createContent();
