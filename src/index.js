import 'dotenv/config';
import express from 'express';
import axios from 'axios'; // Pour appeler les APIs externes

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const BASE_URL = "https://api-ugi2pflmha-ew.a.run.app";

app.use(express.json()); // Middleware pour lire du JSON

let recipesDB = []; // Stockage en mémoire des recettes

// Route GET : récupérer infos ville + météo
app.get("/cities/:cityId/infos", async (req, res) => {
  try {
    const cityId = req.params.cityId;

    console.log(`🔍 Recherche des infos pour la ville : ${cityId}`);

    // Récupérer les infos de la ville depuis City API
    const cityResponse = await axios.get(`${BASE_URL}/cities/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });

    if (!cityResponse.data) {
      return res.status(404).json({ error: "Ville non trouvée" });
    }

    const cityData = cityResponse.data;

    // Récupérer les prévisions météo depuis Weather API
    const weatherResponse = await axios.get(`${BASE_URL}/weather/${cityId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });

    if (!weatherResponse.data || !weatherResponse.data.predictions) {
      return res.status(404).json({ error: "Prévisions météo non trouvées" });
    }

    const weatherData = weatherResponse.data;

    console.log(`✅ Données récupérées pour ${cityId}`);

    // Construire la réponse
    res.json({
      coordinates: cityData.coordinates || [],
      population: cityData.population || 0,
      knownFor: cityData.knownFor || [],
      weatherPredictions: weatherData.predictions || [],
      recipes: recipesDB.filter(recipe => recipe.cityId === cityId)
    });

  } catch (error) {
    console.error("❌ Erreur lors de la récupération des infos :", error.message);
    res.status(404).json({ error: "Ville non trouvée ou problème avec l'API externe" });
  }
});

// Route POST : ajouter une recette
app.post("/cities/:cityId/recipes", (req, res) => {
  const cityId = req.params.cityId;
  const { content } = req.body;

  // Vérification des paramètres
  if (!content || content.length < 10 || content.length > 2000) {
    return res.status(400).json({ error: "Le contenu doit être entre 10 et 2000 caractères" });
  }

  // Création d'un nouvel ID unique
  const recipeId = recipesDB.length + 1;
  const newRecipe = { id: recipeId, content, cityId };

  // Ajouter la recette en mémoire
  recipesDB.push(newRecipe);

  console.log(`✅ Recette ajoutée pour ${cityId}: ${content}`);

  res.status(201).json(newRecipe);
});

// Route DELETE : supprimer une recette
app.delete("/cities/:cityId/recipes/:recipeId", (req, res) => {
  const cityId = req.params.cityId;
  const recipeId = parseInt(req.params.recipeId);

  // Trouver la recette
  const index = recipesDB.findIndex(r => r.id === recipeId && r.cityId === cityId);
  
  if (index === -1) {
    return res.status(404).json({ error: "Recette non trouvée" });
  }

  // Supprimer la recette
  recipesDB.splice(index, 1);

  console.log(`✅ Recette ${recipeId} supprimée pour ${cityId}`);

  res.status(204).send();
});

// Démarrer le serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
