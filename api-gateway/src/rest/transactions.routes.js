const { Router } = require('express');
const client = require('../grpc-clients/transactions.client');

const router = Router();


router.post('/depot', async (req, res) => {
  try {
    const result = await client.deposer(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.post('/retrait', async (req, res) => {
  try {
    const result = await client.retirer(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.post('/virement', async (req, res) => {
  try {
    const result = await client.virer(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/historique/:compteId', async (req, res) => {
  try {
    const limite = req.query.limite ? parseInt(req.query.limite, 10) : 50;
    const { transactions } = await client.obtenirHistorique({
      compte_id: req.params.compteId,
      limite,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
