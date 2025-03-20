import 'dotenv/config'
import Fastify from 'fastify'
import axios from 'axios' // Pour appeler les APIs externes
import { submitForReview } from './submission.js'

const fastify = Fastify({
  logger: true,
})

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://api-ugi2pflmha-ew.a.run.app";

// Route GET : récupérer infos ville + météo
fastify.get("/cities/:cityId/infos", async (request, reply) => {
  try {
    const cityId = request.params.cityId;

    fastify.log.info(`🔍 Recherche des infos pour la ville : ${cityId}`);

    // Récupérer les infos de la ville depuis City API
    const cityResponse = await axios.get(`${BASE_URL}/cities/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });

    if (!cityResponse.data) {
      return reply.status(404).send({ error: "Ville non trouvée" });
    }

    const cityData = cityResponse.data;

    // Récupérer les prévisions météo depuis Weather API
    const weatherResponse = await axios.get(`${BASE_URL}/weather/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });

    if (!weatherResponse.data || !weatherResponse.data.predictions) {
      return reply.status(404).send({ error: "Prévisions météo non trouvées" });
    }

    const weatherData = weatherResponse.data;

    fastify.log.info(`✅ Données récupérées pour ${cityId}`);

    // Construire la réponse
    return {
      coordinates: cityData.coordinates || [],
      population: cityData.population || 0,
      knownFor: cityData.knownFor || [],
      weatherPredictions: weatherData.predictions || [],
      recipes: cityData.recipes || []
    };

  } catch (error) {
    fastify.log.error(`❌ Erreur lors de la récupération des infos : ${error.message}`);
    return reply.status(404).send({ error: "Ville non trouvée ou problème avec l'API externe" });
  }
});

// Démarrage du serveur Fastify
fastify.listen(
  {
    port: process.env.PORT || 3000,
    host: process.env.RENDER_EXTERNAL_URL ? '0.0.0.0' : process.env.HOST || 'localhost',
  },
  function (err) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }

    //////////////////////////////////////////////////////////////////////
    // Don't delete this line, it is used to submit your API for review //
    // everytime your start your server.                                //
    //////////////////////////////////////////////////////////////////////
    submitForReview(fastify)
  }
)
