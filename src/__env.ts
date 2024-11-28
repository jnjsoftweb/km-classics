import dotenv from 'dotenv';

dotenv.config({ path: `../.env` });

const {
  BASE_URL,
  BASE_DIR,
  REPO_DIR,
  CHROME_EMAIL,
  CHROME_PROFILE_NAME,
  CHROME_USER_DATA_DIR,
} = process.env;

const WEB_STATIC_ROOT = `${REPO_DIR}/public`;
const INFO_STATIC_ROOT = `${REPO_DIR}/public/info`;
const HTML_DYNAMIC_ROOT = `${REPO_DIR}/html`;
const JSON_BOOK_LIST = `${REPO_DIR}/bookList.json`;

// ** scraper constants
const MAX_RETRIES = 10;
const RETRIES_WAIT_TIME = 5000;
const LOADED_WAIT_TIME = 60000;

// ** scraper selectors
const DESC_SECTION = 'div[class*=section_desc]';

export {
  BASE_URL,
  BASE_DIR,
  REPO_DIR,
  CHROME_EMAIL,
  CHROME_PROFILE_NAME,
  CHROME_USER_DATA_DIR,
  WEB_STATIC_ROOT,
  INFO_STATIC_ROOT,
  HTML_DYNAMIC_ROOT,
  JSON_BOOK_LIST,
  MAX_RETRIES,
  RETRIES_WAIT_TIME,
  LOADED_WAIT_TIME,
  DESC_SECTION,
};
