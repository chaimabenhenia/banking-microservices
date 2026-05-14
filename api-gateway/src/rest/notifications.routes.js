const { Router } = require('express');
const client = require('../grpc-clients/notifications.client');

const router = Router();


router.get('/:compteId', async (req, res) => {
  try {
    const { notifications } = await client.obtenirNotifications({ compte_id: req.params.compteId });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:compteId/non-lues', async (req, res) => {
  try {
    const result = await client.compterNonLues({ compte_id: req.params.compteId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/:notifId/lue', async (req, res) => {
  try {
    const result = await client.marquerCommeLue({ notif_id: req.params.notifId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
