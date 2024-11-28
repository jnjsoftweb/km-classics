import {
  Chrome,
  loadJson,
  saveJson,
  saveFile,
  loadFile,
  findFiles,
} from 'jnj-utils';
import * as cheerio from 'cheerio';
import { By, until, WebElement } from 'selenium-webdriver'; // 추가된 부분
import {
  BASE_URL,
  BASE_DIR,
  CHROME_EMAIL,
  CHROME_PROFILE_NAME,
  CHROME_USER_DATA_DIR,
  WEB_STATIC_ROOT,
  HTML_DYNAMIC_ROOT,
  JSON_BOOK_LIST,
  MAX_RETRIES,
  RETRIES_WAIT_TIME,
  LOADED_WAIT_TIME,
  DESC_SECTION,
} from './__env.js';
import fetch, { Response } from 'node-fetch';
import * as fs from 'fs';

// 인터페이스 정의들을 파일 상단에 추가
interface BookInfo {
  index: string;
  title: string;
  volumes: string;
  size: string;
  url: string;
  url_v: string[];
}

interface ChromeOptions {
  headless: boolean;
  userDataDir?: string;
  profileName?: string;
  email?: string;
}

interface ImageInfo {
  filename: string;
  data: Buffer;
  contentType: string | null;
  size: number;
  savedPath?: string;
}

// Chrome 클래스 타입 정의
interface ChromeOptions {
  headless: boolean;
  userDataDir?: string;
  profileName?: string;
  email?: string;
}

// ** 스크래핑 후 처리
const urlFromPath = (path: string) => {
  const [bookNum, volumeNum] = path
    .split('/')
    .slice(-1)[0]
    .split('.')[0]
    .split('_');
  return `${BASE_URL}/books/${bookNum}/volume/${volumeNum}`;
};

// 파일에 bottomCollapseDirectionClose 클래스가 있는지 확인
const hasClosedFold = (filePath: string) => {
  return loadFile(filePath).includes('bottomCollapseDirectionClose');
};

// 재스크래핑이 필요한 URL 목록 반환
const urlsReScrape = (folder = HTML_DYNAMIC_ROOT) => {
  return findFiles(folder)
    .filter((file) => hasClosedFold(file))
    .map((file) => urlFromPath(file));
};

// 파일에 있는 img 태그의 src 속성 추출
const extractImgSrc = (filePath: string) => {
  const $ = cheerio.load(loadFile(filePath));
  return $('img')
    .map((i, el) => $(el).attr('src'))
    .get();
};

const extractImgSrcsInFolder = (folder = HTML_DYNAMIC_ROOT) => {
  return [
    ...new Set(
      findFiles(folder)
        .map((file) => extractImgSrc(file))
        .flat()
    ),
  ].map((src) => `${BASE_URL}${src}`);
};

// 이미지 URL에서 파일명과 데이터 추출
const getImageInfo = async (imageUrl: string): Promise<ImageInfo | null> => {
  try {
    const response: Response = await fetch(imageUrl);

    // Content-Disposition 헤더에서 파일명 추출
    const contentDisposition = response.headers.get('content-disposition');
    let filename = '';

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // 파일명이 없으면 URL에서 마지막 부분 사용
    if (!filename) {
      filename = imageUrl.split('/').pop() + '.jpg';
    }

    // 이미지 데이터를 Buffer로 변환
    const imageData = await response.buffer();

    return {
      filename,
      data: imageData,
      contentType: response.headers.get('content-type'),
      size: imageData.length,
    };
  } catch (error) {
    console.error(`Error fetching image from ${imageUrl}:`, error);
    return null;
  }
};

// 이미지 다운로드 및 저장
const downloadImage = async (
  imageUrl: string,
  outputDir: string = `${BASE_DIR}/data/images`
): Promise<ImageInfo | null> => {
  const imageInfo = await getImageInfo(imageUrl);

  if (!imageInfo) {
    return null;
  }

  const outputPath = `${outputDir}/${imageInfo.filename}`;
  fs.writeFileSync(outputPath, imageInfo.data);

  return {
    ...imageInfo,
    savedPath: outputPath,
  };
};

// ** 스크래핑

function envelopeHtml(html: string): string {
  return html;
  // return `<html><body>${html}</body></html>`;
}

function getVolumeInfo(url: string): { bookNum: string; volumeNum: string } {
  const parts = url.split('/');
  let bookNum = '';
  let volumeNum = '';

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'books') {
      bookNum = parts[i + 1];
    }
    if (parts[i] === 'volume') {
      volumeNum = parts[i + 1];
    }
  }

  return { bookNum, volumeNum };
}

function pathFromUrl(url: string) {
  const base = BASE_URL!.split('/').slice(-1)[0];
  return url
    .split(base)
    .slice(-1)[0]
    .split('/')
    .filter((s) => s !== '')
    .join('/');
}

function staticHtmlPathFromUrl(url: string) {
  return `${WEB_STATIC_ROOT}/${pathFromUrl(url)}/index.html`;
}

function dynamicHtmlPathFromUrl(url: string) {
  return `${HTML_DYNAMIC_ROOT}/${pathFromUrl(url)}.html`;
}

function htmlPathFromUrl(url: string, type = 'static') {
  return type === 'static'
    ? staticHtmlPathFromUrl(url)
    : dynamicHtmlPathFromUrl(url);
}

// ! 코드 복원 필요
// 한의학고전DB 서적 리스트(권url 포함) -> json File(bookList.json)
// async function fetchBookList(soup: cheerio.CheerioAPI): Promise<void> {
//   const lists = soup('tr.ng-scope');
//   const bookList: BookInfo[] = [];

//   for (const ls of lists) {
//     const dic = {
//       index: '',
//       title: '',
//       volumes: '',
//       size: '',
//       url: '',
//       url_v: [],
//     };

//     dic.index = soup(ls).find('th').text().trim();
//     const tds = soup(ls).find('td');
//     dic.title = soup(tds[0]).text().trim();
//     dic.volumes = soup(tds[1]).text().trim();
//     dic.size = soup(tds[2]).text().trim();
//     dic.url = soup(ls).find('a').attr('href') || '';
//     dic.url_v = await fetchVolumeList(dic.url);

//     bookList.push(dic);
//   }

//   // console.log(bookList);

//   // await fs.writeFile("bookList.json", JSON.stringify(bookList, null, 2), "utf-8");
//   saveJson('../../bookList.json', bookList);
// }

// ** 클래스
class Scraper {
  chrome: any;
  constructor() {
    this.chrome = new Chrome({
      headless: false,
      profileName: CHROME_PROFILE_NAME,
      email: CHROME_EMAIL,
    });
  }

  // # 정적 페이지

  // * 정적 페이지 크롤링
  async fetchStaticHtml(
    url: string = 'https://mediclassics.kr/books/162/',
    waitEl: string = '',
    waitTime: number = 3000
  ): Promise<string> {
    try {
      await this.chrome.goto(url);
      if (waitEl != '') {
        const elements = await this.chrome.findElements(waitEl);
      } else {
        await this.chrome.driver.sleep(waitTime);
      }

      const html = await this.chrome.getPageSource();
      // console.log(html);
      return html;
    } catch (error) {
      console.error('Error in fetchVolumeList:', error);
      return '';
    }
  }

  async saveStaticHtml(
    url: string,
    waitEl: string = '',
    waitTime: number = 3000
  ): Promise<void> {
    saveFile(
      staticHtmlPathFromUrl(url),
      await this.fetchStaticHtml(url, waitEl, waitTime)
    );
    await this.chrome.sleep(1000);
  }

  // * 동적 페이지(고전 서적 섹션 페이지)

  async foldedDivs(section: WebElement, depth: string): Promise<WebElement[]> {
    const sel = `div.sec_h${depth}:not(.no-child):not(.loaded)`;
    return await section.findElements(By.css(sel));
  }

  async allFoldDivs(section: WebElement, depth: string): Promise<WebElement[]> {
    const sel = `div.sec_h${depth}:not(.no-child):not([bottom_count="0"])`;
    return await section.findElements(By.css(sel));
  }

  async isLoaded(div: WebElement): Promise<boolean> {
    const className = await div.getAttribute('class');
    return className.includes('loaded');
  }

  // * loaded 상태에서 표제어 접힌 상태인지 확인
  async isClosed(div: WebElement): Promise<boolean> {
    const className = await div.getAttribute('class');
    return className.includes('bottomCollapseDirectionClose');
    // return !className.includes("sec_h3") || className.includes("bottomCollapseDirectionClose");
  }

  async clickFold(div: WebElement, waitTime: number = 500): Promise<boolean> {
    try {
      // 요소가 화면에 보이도록 스크롤
      await this.chrome.driver.executeScript(
        'arguments[0].scrollIntoView(true);',
        div
      );
      await this.chrome.sleep(100); // 스크롤 완료 대기

      // 클릭 시도
      await this.chrome.driver.executeScript('arguments[0].click();', div);
      // console.log(`+++++click div`);

      // loaded 클래스가 추가될 때까지 명시적으로 대기
      try {
        await this.chrome.driver.wait(async () => {
          const className = await div.getAttribute('class');
          return className.includes('loaded');
        }, LOADED_WAIT_TIME);

        console.log(`+++++loaded 상태 확인됨`);

        const _isClosed = await this.isClosed(div);
        // console.log(`******_isClosed: ${_isClosed}`);

        if (_isClosed) {
          await this.chrome.driver.executeScript('arguments[0].click();', div);
          await this.chrome.sleep(100);
        }
        return true;
      } catch (timeoutError) {
        console.log(`!!!!!loaded 상태 대기 시간 초과`);
        return false;
      }
    } catch (error) {
      console.error('Error in clickFold:', error);
      return false;
    }
  }

  // * 표제어 펼치기/접기
  async openFold(section: WebElement, depth: string): Promise<number> {
    const divs = await this.allFoldDivs(section, depth);
    let _isLoaded = false;
    let titleText = '--';

    for (const div of divs) {
      try {
        const title = await div.findElement(
          By.css("a[title='표제어 펼치기/접기']")
        );
        titleText = await title.getText();

        console.log(`##### div: ${titleText}`);

        let attempts = 0;
        let retries = 0;
        _isLoaded = await this.clickFold(div);
        while (_isLoaded == false) {
          if (retries < MAX_RETRIES) {
            _isLoaded = await this.clickFold(div, RETRIES_WAIT_TIME);
            retries++;
            console.log(`${retries}번째 retry 시도`);
          } else {
            console.log(
              `!!!! ${depth} ${titleText}번째 표제어 펼치기/접기 실패`
            );
            return 0;
          }
        }
      } catch (error) {
        console.error('Error in openFold:', error);
      } finally {
        console.log(`=======${depth} ${titleText}`);
      }
    }
    return 1;
  }

  // * 서적 섹션 페이지 크롤링
  async fetchVolume(
    url: string,
    foldCss: string = DESC_SECTION
  ): Promise<string> {
    await this.chrome.goto(url);
    await this.chrome.driver.executeScript('localStorage.clear();');
    console.log(`cache is cleared url: ${url}`);

    // * 서적 섹션 페이지 로딩 대기
    await this.chrome.driver.wait(
      until.elementLocated(By.css(foldCss)),
      120000
    );

    // open fold
    const sections = await this.chrome.driver.findElements(By.css(foldCss));

    for (const depth of ['3', '4', '5', '6', '7', '8', '9']) {
      for (const section of sections) {
        const success = await this.openFold(section, depth);
        if (!success) {
          // 수동으로 펼치기
          console.log(`!!!!!! 수동으로 펼치기 해야 합니다. url: ${url}`);
          return '';
        }
      }
    }

    // return await this.chrome.driver.getPageSource();
    const html = await this.chrome.getPageSource();
    const $ = cheerio.load(html);

    return $.html($('#container'));
  }

  async saveVolume(
    url: string,
    foldCss: string = DESC_SECTION
  ): Promise<string> {
    const html = await this.fetchVolume(url, foldCss);
    const { bookNum, volumeNum } = getVolumeInfo(url);
    saveFile(
      `${HTML_DYNAMIC_ROOT}/${bookNum}_${volumeNum}.html`,
      envelopeHtml(html)
    );
    return html;
  }

  async saveBook(
    bookObj: BookInfo,
    foldCss: string = DESC_SECTION
  ): Promise<string> {
    const url_v = bookObj.url_v;
    for (const url of url_v) {
      const html = await this.saveVolume(url, foldCss);
      if (html == '') {
        return '';
      }
    }
    return 'success';
  }

  async saveBooks(books: BookInfo[]): Promise<string> {
    for (const book of books) {
      const html = await this.saveBook(book);
      if (html == '') {
        return '';
      }
    }
    return 'success';
  }
}

export default Scraper;

// const chrome = new Chrome({
//   headless: false,
//   email: CHROME_EMAIL,
//   userDataDir: CHROME_USER_DATA_DIR,
//   // profileName: CHROME_PROFILE_NAME,
// });

// chrome.goto('https://example.com');
// // chrome.driver.sleep(60000);
// // chrome.close();
