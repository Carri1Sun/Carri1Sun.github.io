'use strict';

hexo.extend.filter.register('template_locals', locals => {
  if (locals.page.layout !== 'post') {
    locals.page.og_img = '/img/og.png';
    locals.page.photos = ['/img/og.png'];
  }

  return locals;
});
