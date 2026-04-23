'use strict';

interface TitledItem {
  title: string;
}

function randomInt(low: number, high: number): number {
  return Math.floor(Math.random() * (high - low) + low);
}

function randomBool(): boolean {
  return Math.random() >= 0.5;
}

function numberWithCommas(x: number | string): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function timeSince(date: number | Date, fullWord?: boolean): string {
  const dateValue = date instanceof Date ? date.valueOf() : date;
  const seconds = Math.floor((new Date().valueOf() - dateValue) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + (fullWord ? ' years' : 'y');
  }

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + (fullWord ? ' months' : 'mo');
  }

  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + (fullWord ? ' days' : 'd');
  }

  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + (fullWord ? ' hours' : 'h');
  }

  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + (fullWord ? ' minutes' : 'm');
  }

  return Math.floor(seconds) + (fullWord ? ' seconds' : 's');
}

function urlify(text: unknown): string {
  if (text === null || text === undefined || text === '') {
    return '';
  }
  const str = typeof text === 'string' ? text : String(text);

  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isObjectIdString(id: string | null | undefined): boolean {
  return Boolean(id && id.length === 24 && id.indexOf('-') === -1);
}

function titleCompare(a: TitledItem, b: TitledItem): number {
  if (a.title < b.title) {
    return -1;
  }
  if (a.title > b.title) {
    return 1;
  }
  return 0;
}

function getShortText(text: string | null | undefined, size = 45): string | null | undefined {
  if (text && text.length > size) {
    const spaceToCut = text.indexOf(' ', size);
    if (spaceToCut >= size) {
      return text.substring(0, spaceToCut) + '...';
    }
  }

  return text;
}

export {
  randomInt,
  randomBool,
  numberWithCommas,
  timeSince,
  urlify,
  isObjectIdString,
  titleCompare,
  getShortText,
};
