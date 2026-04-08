'use strict';

interface PagedFindOptions {
  filters?: Record<string, unknown>;
  keys?: string;
  limit?: number;
  page?: number;
  sort?: Record<string, 1 | -1>;
}

interface PagedFindOutput<TData = unknown> {
  data: TData[] | null;
  pages: {
    current: number;
    prev: number;
    hasPrev: boolean;
    next: number;
    hasNext: boolean;
    total: number;
  };
  items: {
    begin: number;
    end: number;
    total: number;
  };
}

type AsyncCallback<T = unknown> = (error: unknown, result: T | null) => void;

interface QueryLike<TData = unknown> {
  skip(value: number): void;
  limit(value: number): void;
  sort(value: Record<string, 1 | -1>): void;
  exec(callback: (error: unknown, results: TData[]) => void): void;
}

interface PagedFindModel<TData = unknown> {
  count(filters: Record<string, unknown>, callback: (error: unknown, count: number) => void): void;
  find(filters: Record<string, unknown>, keys: string): QueryLike<TData>;
}

interface PagedFindSchema {
  statics: {
    pagedFind?: (options: PagedFindOptions, cb: AsyncCallback<PagedFindOutput>) => void;
    [key: string]: unknown;
  };
}

module.exports = function pagedFindPlugin(schema: PagedFindSchema): void {
  schema.statics.pagedFind = function (options: PagedFindOptions, cb: AsyncCallback<PagedFindOutput>) {
    const self = this as unknown as PagedFindModel;
    const normalizedOptions: Required<PagedFindOptions> = {
      filters: options.filters ?? {},
      keys: options.keys ?? '',
      limit: options.limit ?? 20,
      page: options.page ?? 1,
      sort: options.sort ?? {},
    };

    const output: PagedFindOutput = {
      data: null,
      pages: {
        current: normalizedOptions.page,
        prev: 0,
        hasPrev: false,
        next: 0,
        hasNext: false,
        total: 0,
      },
      items: {
        begin: normalizedOptions.page * normalizedOptions.limit - normalizedOptions.limit + 1,
        end: normalizedOptions.page * normalizedOptions.limit,
        total: 0,
      },
    };

    const countResults = function (callback: AsyncCallback<string>) {
      self.count(normalizedOptions.filters, function (_err, count) {
        output.items.total = count;
        callback(null, 'done counting');
      });
    };

    const getResults = function (callback: AsyncCallback<string>) {
      const query = self.find(normalizedOptions.filters, normalizedOptions.keys);
      query.skip((normalizedOptions.page - 1) * normalizedOptions.limit);
      query.limit(normalizedOptions.limit);
      query.sort(normalizedOptions.sort);
      query.exec(function (_err, results) {
        output.data = results;
        callback(null, 'done getting records');
      });
    };

    const asyncLib = require('async') as {
      parallel(tasks: Array<(callback: AsyncCallback<string>) => void>, callback: AsyncCallback<unknown>): void;
    };

    asyncLib.parallel([countResults, getResults], function (err) {
      if (err) {
        cb(err, null);
        return;
      }

      output.pages.total = Math.ceil(output.items.total / normalizedOptions.limit);
      output.pages.next =
        output.pages.current + 1 > output.pages.total ? 0 : output.pages.current + 1;
      output.pages.hasNext = output.pages.next !== 0;
      output.pages.prev = output.pages.current - 1;
      output.pages.hasPrev = output.pages.prev !== 0;

      if (output.items.end > output.items.total) {
        output.items.end = output.items.total;
      }

      cb(null, output);
    });
  };
};
