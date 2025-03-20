import 'dotenv/config'
import Fastify from 'fastify'
import { submitForReview } from './submission.js'

const fastify = Fastify({
  logger: true,
})

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
const express = require("express");
const axios = require("axios"); // Pour appeler les APIs externes

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://api-ugi2pflmha-ew.a.run.app";

app.use(express.json()); // Middleware pour lire du JSON

// Route GET : récupérer infos ville + météo
app.get("/cities/:cityId/infos", async (req, res) => {
  try {
    const cityId = req.params.cityId;

    // Récupérer les infos de la ville depuis City API
    const cityResponse = await axios.get(`${BASE_URL}/cities/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });

    const cityData = cityResponse.data;

    // Récupérer les prévisions météo depuis Weather API
    const weatherResponse = await axios.get(`${BASE_URL}/weather/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });

    const weatherData = weatherResponse.data;

    // Construire la réponse
    res.json({
      coordinates: cityData.coordinates,
      population: cityData.population,
      knownFor: cityData.knownFor,
      weatherPredictions: weatherData.predictions,
      recipes: cityData.recipes || []
    });

  } catch (error) {
    res.status(404).json({ error: "Ville non trouvée" });
  }
});
let recipesDB = []; // Stockage en mémoire

app.post("/cities/:cityId/recipes", (req, res) => {
  const cityId = req.params.cityId;
  const { content } = req.body;

  // Vérification de la validité du contenu
  if (!content || content.length < 10 || content.length > 2000) {
    return res.status(400).json({ error: "Le contenu doit être entre 10 et 2000 caractères" });
  }

  // Créer un nouvel ID unique
  const recipeId = recipesDB.length + 1;
  const newRecipe = { id: recipeId, content, cityId };

  // Ajouter la recette à la base
  recipesDB.push(newRecipe);

  res.status(201).json(newRecipe);
});
app.delete("/cities/:cityId/recipes/:recipeId", (req, res) => {
  const cityId = req.params.cityId;
  const recipeId = parseInt(req.params.recipeId);

  // Trouver l'index de la recette
  const index = recipesDB.findIndex(r => r.id === recipeId && r.cityId === cityId);
  
  if (index === -1) {
    return res.status(404).json({ error: "Recette non trouvée" });
  }

  // Supprimer la recette
  recipesDB.splice(index, 1);
  res.status(204).send();
});
