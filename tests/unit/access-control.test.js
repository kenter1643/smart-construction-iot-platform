const { buildInClause, toUniqueNumberArray, buildTree } = require('../../backend/services/user-auth/src/utils/accessControl');

describe('accessControl utils', () => {
  test('buildInClause should build placeholder clause', () => {
    const result = buildInClause([1, 2, 3]);
    expect(result.clause).toBe('(?, ?, ?)');
    expect(result.params).toEqual([1, 2, 3]);
  });

  test('buildInClause should return NULL clause for empty list', () => {
    const result = buildInClause([]);
    expect(result.clause).toBe('(NULL)');
    expect(result.params).toEqual([]);
  });

  test('toUniqueNumberArray should normalize values', () => {
    expect(toUniqueNumberArray([1, '2', 2, 'x', 0, -3, 4])).toEqual([1, 2, 4]);
  });

  test('buildTree should preserve hierarchy and ordering', () => {
    const tree = buildTree([
      { id: 3, parent_id: 1, sort_order: 2, name: 'C' },
      { id: 1, parent_id: null, sort_order: 1, name: 'A' },
      { id: 2, parent_id: 1, sort_order: 1, name: 'B' }
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children.map((item) => item.id)).toEqual([2, 3]);
  });
});
