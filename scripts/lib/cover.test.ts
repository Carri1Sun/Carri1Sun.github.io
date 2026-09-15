import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCover, coverPresets } from './cover.ts';
import { parseFrontmatter } from './utils.ts';

test('缺省与空值使用轨道封面', () => {
  for (const value of [undefined, null, '', ' ']) {
    assert.deepEqual(parseCover(value), { preset: 'orbit' });
  }
});

test('frontmatter 支持全部枚举和数字简写', () => {
  coverPresets.forEach((preset, index) => {
    for (const value of [preset, index, `"${index}"`]) {
      const { data } = parseFrontmatter(`---\ncover: ${value}\n---\n正文`);
      assert.deepEqual(parseCover(data.cover), { preset });
    }
  });
});

test('本地路径在首页与嵌套列表页均从网站根加载，中文路径只编码一次', () => {
  for (const value of ['/assets/covers/封面 1.webp', 'assets/covers/封面 1.webp', '/assets/covers/%E5%B0%81%E9%9D%A2%201.webp']) {
    assert.equal(parseCover(value).image, '/assets/covers/%E5%B0%81%E9%9D%A2%201.webp');
  }
});

test('保留远端 HTTPS 图片查询参数', () => {
  const url = 'https://example.com/cover.webp?width=800&v=2';
  assert.equal(parseCover(url).image, url);
});

test('拒绝错误枚举、不可部署的路径和不安全协议', () => {
  for (const value of [4, -1, true, [], 'oribt', '../cover.png', '/Users/me/cover.png', '/assets/../secret.png', '/assets/%2e%2e/secret.png', 'file:///tmp/a.png', 'javascript:alert(1)', 'http://example.com/a.png', '//example.com/a.png', 'https://user:password@example.com/a.png']) {
    assert.throws(() => parseCover(value));
  }
});
