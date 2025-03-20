import 'dotenv/config'
import Fastify from 'fastify'
import axios from 'axios'
import { submitForReview } from './submission.js'

const fastify = Fastify({
  logger: true,
})

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://api-ugi2pflmha-ew.a.run.app";

let recipesDB = []; // Stockage temporaire des recettes en mémoire

// 🟢 Route GET : récupérer infos ville + météo
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

    // Récupérer les recettes associées à cette ville
    const cityRecipes = recipesDB.filter(recipe => recipe.cityId === cityId);

    // 🔥 Format de la réponse corrigé
    return {
      coordinates: cityData.coordinates || [0, 0], // Tableau [lat, lon]
      population: cityData.population || 0,
      knownFor: cityData.knownFor || [],
      weatherPredictions: weatherData.predictions || [],
      recipes: cityRecipes
    };

  } catch (error) {
    fastify.log.error(`❌ Erreur lors de la récupération des infos : ${error.message}`);
    return reply.status(404).send({ error: "Ville non trouvée ou problème avec l'API externe" });
  }
});

// 🟢 Route POST : Ajouter une recette à une ville
fastify.post("/cities/:cityId/recipes", async (request, reply) => {
  const cityId = request.params.cityId;
  const { content } = request.body;

  // Vérifier si la ville existe avant d'ajouter une recette
  try {
    await axios.get(`${BASE_URL}/cities/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
  } catch {
    return reply.status(404).send({ error: "Ville non trouvée" });
  }

  // Vérification des paramètres
  if (!content || content.length < 10 || content.length > 2000) {
    return reply.status(400).send({ error: "Le contenu doit être entre 10 et 2000 caractères" });
  }

  // Création d'un nouvel ID unique
  const recipeId = recipesDB.length + 1;
  const newRecipe = { id: recipeId, content, cityId };

  // Ajouter la recette en mémoire
  recipesDB.push(newRecipe);

  fastify.log.info(`✅ Recette ajoutée pour ${cityId}: ${content}`);

  return reply.status(201).send(newRecipe);
});

// 🟢 Route DELETE : Supprimer une recette d'une ville
fastify.delete("/cities/:cityId/recipes/:recipeId", async (request, reply) => {
  const cityId = request.params.cityId;
  const recipeId = parseInt(request.params.recipeId);

  // Vérifier si la ville existe avant de supprimer une recette
  try {
    await axios.get(`${BASE_URL}/cities/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
  } catch {
    return reply.status(404).send({ error: "Ville non trouvée" });
  }

  // Trouver la recette à supprimer
  const index = recipesDB.findIndex(r => r.id === recipeId && r.cityId === cityId);

  if (index === -1) {
    return reply.status(404).send({ error: "Recette non trouvée" });
  }

  // Supprimer la recette
  recipesDB.splice(index, 1);

  fastify.log.info(`✅ Recette ${recipeId} supprimée pour ${cityId}`);

  return reply.status(204).send();
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
