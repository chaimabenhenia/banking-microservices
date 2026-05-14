const { Router } = require('express');
const client = require('../grpc-clients/comptes.client');

const router = Router();


router.post('/', async (req, res) => {
  try {
    const result = await client.creerCompte(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { comptes } = await client.listerComptes({});
    res.json(comptes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const result = await client.obtenirCompte({ id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});


router.put('/:id/solde', async (req, res) => {
  try {
    const result = await client.mettreAJourSolde({ id: req.params.id, solde: req.body.solde });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const result = await client.supprimerCompte({ id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
