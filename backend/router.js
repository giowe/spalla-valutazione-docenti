'use strict';

module.exports = (router) => {
  router.get('/', (req, res) => {
    res.send('ciaone');
  });
  
  return router;
};
