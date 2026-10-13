import { route, authWith } from '../lib/common.js';

// Checks credentials sent in the body. The page then keeps them and sends them as headers.
export default route(['POST'], async (req, res) => {
  const body = req.body || {};
  const a = authWith(body.password, body.pin);
  res.status(200).json(a);
});
