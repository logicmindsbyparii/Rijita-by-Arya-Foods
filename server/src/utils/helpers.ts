import slugify from 'slugify';

export const generateSlug = (text: string): string => slugify(text, { lower: true, strict: true });

export const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const paginateQuery = (page: number, limit: number) => {
  const p = Math.max(1, page);
  const l = Math.min(50, Math.max(1, limit));
  return { skip: (p - 1) * l, limit: l, page: p };
};

export const buildPagination = (total: number, page: number, limit: number) => ({
  page, limit, total, totalPages: Math.ceil(total / limit) || 1,
});
