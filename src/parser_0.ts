import * as cheerio from 'cheerio';
import { loadFile, saveJson, loadJson, saveFile } from 'jnj-utils';
import { createRequire } from 'module';
import { BASE_URL, WEB_STATIC_ROOT, HTML_DYNAMIC_ROOT, REPO_DIR } from './__env.js';

const require = createRequire(import.meta.url);
const hanja = require('hanja').default;

// 상단에 타입 정의 추가
interface BookList {
  bookId: string;
  bookNum: number;
  title: string;
  volumes: number;
  chars: number;
}

interface BookInfo {
  bookId: string;
  bookNum: number;
  source: string;
  [key: string]: string | number | undefined;
  title?: string;
  titleChinese?: string;
  author?: string;
  publishYear?: string;
  translator?: string;
  edition?: string;
  language?: string;
  physicalInfo?: string;
  publisher?: string;
  location?: string;
  confidenceLevel?: string;
  abstract?: string;
  references?: string;
  volume?: string;
  translatorInfo?: string;
  bibliographicInfo?: string;
  authorInfo?: string;
  publicationInfo?: string;
  classification?: string;
  subject?: string;
  keywords?: string;
  ebooks?: string;
  category?: string;
  similars?: string;
}

const infoMap: { [key: string]: keyof BookInfo } = {
  저편자: 'author',
  간행시기: 'publishYear',
  번역자: 'translator',
  판사항: 'edition',
  언어: 'language',
  형태서지: 'physicalInfo',
  발행처: 'publisher',
  소장처: 'location',
  신뢰수준: 'confidenceLevel',
  해제: 'abstract',
  참고자료: 'references',
  권호: 'volume',
  역자정보: 'translatorInfo',
  서지사항: 'bibliographicInfo',
  저자사항: 'authorInfo',
  출판사항: 'publicationInfo',
  분류: 'classification',
  주제: 'subject',
  키워드: 'keywords',
  출처: 'source',
};

const BOOKS_PATH = `${WEB_STATIC_ROOT}/books`;
const LIST_PATH = `${WEB_STATIC_ROOT}/list/index.html`;
const BOOK_LIST_JSON_PATH = `${REPO_DIR}/bookList.json`;
// 권수, 글자수 http://127.0.0.1:5500/mediclassics/public/list/index.html

// 함수 시그니처 수정
const getSourceId = (source: string = 'mediclassics'): string => {
  if (source === 'mediclassics') return 'MC';
  return '';
};

const getBookId = (
  bookNum: number,
  source: string = 'mediclassics'
): string => {
  return `${getSourceId(source)}_${bookNum.toString().padStart(5, '0')}`;
};

// # 도서 목록
const bookListByPath = (path: string = LIST_PATH): BookList[] => {
  return bookListFromHtml(loadFile(path));
};


const bookListFromHtml = (html: string): BookList[] => {
  const $ = cheerio.load(html);
  const list: BookList[] = [];

  // 테이블의 각 행을 순회
  $('table tbody tr').each((_, tr) => {
    const title = $(tr).find('td:nth-child(2)').text().trim();
    const volumes = parseInt(
      $(tr).find('td:nth-child(3)').text().replace(/,/g, ''),
      10
    );
    const chars = parseInt(
      $(tr).find('td:nth-child(4)').text().replace(/,/g, ''),
      10
    );

    // URL 추출 - a 태그의 href 속성에서 bookNum 추출
    const url = $(tr).find('td:nth-child(5) a').attr('href');
    const bookNum = url?.split('/').pop() ?? ''; // URL의 마지막 부분을 bookNum로 사용

    list.push({
      bookId: getBookId(parseInt(bookNum)),
      bookNum: parseInt(bookNum),
      title,
      volumes,
      chars,
    });
  });

  return list;
};

// # 도서 정보
const bookInfoBybookNum = (
  bookNum: number = 1,
  source: string = 'mediclassics'
): BookInfo => {
  const html = loadFile(`${BOOKS_PATH}/${bookNum}/index.html`);
  return bookInfoFromHtml(html, bookNum, source);
};

const bookInfoFromHtml = (
  html: string,
  bookNum: number = 1,
  source: string = 'mediclassics'
): BookInfo => {
  const $ = cheerio.load(html);
  let info: BookInfo = {
    bookId: getBookId(bookNum, source),
    bookNum,
    source,
    title: '',
    titleChinese: '',
  };

  // 기본 정보 추출
  info.title = $('.book_tit h2 span:first-child').text().trim();
  info.titleChinese = $('.book_tit h2 .chinese small').text().trim();

  // 서적 기본 정보 추출
  $('.basic_txt li').each((_, el) => {
    const text = $(el).text().trim();
    const [key, value] = text.split(' : ').map((s) => s.trim());
    const mappedKey = infoMap[key];
    if (mappedKey) {
      info[mappedKey] = value;
    }
  });

  // eBook 정보 추출
  const ebooks: string[] = [];
  const baseUrl = 'https://info.mediclassics.kr/bookshelf/books/';
  $('#ebook_link a').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      ebooks.push(href.replace(baseUrl, ''));
    }
  });
  info.ebooks = ebooks.join(',');

  // 해제 추출
  info.abstract = $('.detail_txt').text().trim();

  // 역자 정보 추출 및 정제
  const translatorInfo: string[] = [];
  $('#trans_list li').each((_, el) => {
    translatorInfo.push($(el).text().trim());
  });
  info.translatorInfo = translatorInfo.join('\n');

  // 분류 정보 추출 및 정제
  const categoryTexts: string[] = [];
  $('.book_list > span.book_all > span').each((_, el) => {
    categoryTexts.push($(el).text().trim());
  });
  info.category = categoryTexts
    .join(' - ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .trim();

  // 유사 도서 ID 추출
  const similars: string[] = [];
  $('#info_list a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('/books/')) {
      const id = href.split('/')[2];
      if (id !== bookNum.toString()) {
        // 현재 책 ID는 제외
        similars.push(id);
      }
    }
  });
  info.similars = [...new Set(similars)].join(','); // 중복 제거

  return info;
};

// * 권번호
const volumeNumsByBookNum = (bookNum: number): number[] => {
  const bookInfo = loadJson(BOOK_LIST_JSON_PATH);
  const book = bookInfo.find((book: any) => book.url === `${BASE_URL}/books/${bookNum}`);
  return book.url_v.map((url: string) => parseInt(url.split('/').pop() ?? '0'));
}

// * 모든 도서 정보
const allBookInfos = (): (BookList & BookInfo)[] => {
  const infos: (BookList & BookInfo)[] = [];
  for (let book of bookListByPath()) {
    const info = bookInfoBybookNum(book.bookNum);
    infos.push({ ...book, ...info });
  }
  return infos;
};

// * 권 별 내용
function volumeContents(bookNum: number, volumeNum: number) {
  const contents: any[] = [];
  let sectNum1 = '0';
  try {
    let html = loadFile(`${HTML_DYNAMIC_ROOT}/${bookNum}_${volumeNum}.html`);

    // HTML 전처리
    html = html
      .replace(/~/g, '∼')
      .replace(/\[/g, '［')
      .replace(/\]/g, '］')
      .replace(/&nbsp;/g, ' ')
      .replace(/ {3,}/g, '  ');

    const $ = cheerio.load(html);

    // 주석 정보를 저장할 Map 생성
    const annotationMap = new Map();

    // 주석 정보 수집
    $('div[id^="ann_desc_"]').each((_, element) => {
      const $element = $(element);
      const id = $element.attr('id')?.replace('ann_desc_', '') || '';
      const type = $element.find('.title').text().trim();
      const desc = $element.find('.desc').text().trim();
      annotationMap.set(id, { type, desc });
    });

    // 콘텐츠 추출
    $('div[id^="content_"]').each((index, element) => {
      const $element = $(element);

      // 콘텐츠 ID와 경로 정보 추출
      const sectId = $element.attr('id')?.replace('content_', '') || '';
      const upath = $element.attr('upath') || '';
      const level = $element.attr('content_level') || '';
      const levelDepth = $element.attr('content_level_depth') || '';
      const _sectNum1 = $element.find('span.sec_num').text().trim() || '';
      sectNum1 = _sectNum1 ? _sectNum1 : sectNum1;
      const sectNum2 = $element.find('dt.sec_num').text().trim() || '';
      const sectNum = sectNum1
        ? sectNum2
          ? `${sectNum1}.${sectNum2}`
          : `${sectNum1}`
        : '';

      function processText($el: any) {
        if (!$el || !$el.length) return '';

        let result = '';

        $el.contents().each((_: any, node: any) => {
          if (node.type === 'text') {
            result += node.data;
          } else if (node.type === 'tag') {
            const $node = $(node);

            if ($node.hasClass('size-sm')) {
              result += `~${$node.text().trim()}~`;
            } else if ($node.attr('seq')) {
              const seq = $node.attr('seq');
              const content = $node.text().trim();
              const annotation = annotationMap.get(seq);
              if (annotation) {
                result += `[${content}]{${annotation.type}: ${annotation.desc}}`;
              } else {
                result += content;
              }
            } else {
              result += $node.text().trim();
            }
          }
        });

        return result.trim();
      }

      try {
        const chineseEl = $element.find('.chinese.or');
        const koreanEl = $element.find('.ko');
        const englishEl = $element.find('.en');

        const chineseText = processText(chineseEl);
        const koreanText = processText(koreanEl);
        const englishText = processText(englishEl);

        const content = {
          volumeNum: volumeNum,
          sectId: parseInt(sectId),
          path: upath,
          level: level,
          depth: levelDepth,
          // sectNum1: sectNum1,
          // sectNum2: sectNum2,
          sectNum: sectNum,
          chinese: chineseText,
          chineseKo: hanja.translate(chineseText, 'SUBSTITUTION'),
          korean: koreanText,
          english: englishText,
        };
        contents.push(content);
      } catch (innerError: any) {
        console.error(
          `Error processing content ${sectId}:`,
          innerError.message
        );
      }
    });
  } catch (error) {
    console.error('Error extracting contents:', error);
  }

  // saveJson(`${bookNum}_${volumeNum}.json`, contents);
  return contents;
}


const toMarkdown = (contents: any[], lang: string) => {
  let md = '';
  for (let content of contents) {
    if (content.level === 'S') {
      md += `## ${content[lang]}\n`;
    } else {
      md += `${content[lang]}\n`;
    }
  }
  return md;
};

export {
  getBookId,
  bookListByPath,
  bookListFromHtml,
  bookInfoBybookNum,
  bookInfoFromHtml,
  volumeNumsByBookNum,
  allBookInfos,
  volumeContents,
  toMarkdown
};

// // console.log(allBookInfos());
// saveJson(`${REPO_DIR}/json/allBookInfos.json`, allBookInfos());
// 1~24 권 별 내용 저장
for (let volNum of Array.from({ length: 24 }, (_, i) => i + 1)) {
  saveJson(`${REPO_DIR}/json/contents_8_${volNum}.json`, volumeContents(8, volNum));
}



// const findbookNumByTitle = (title, books=bookListByPath()) => {
//   return books.find(book => book.title === title)?.bookNum;
// };

// bookInfoBybookNum('8')
// console.log(bookInfoBybookNum('8'));

// console.log(volumeNumsByBookNum(8));