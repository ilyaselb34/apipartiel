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
// Store recipes in memory
const recipes = new Map()
let nextRecipeId = 1

// GET /cities/:cityId/infos
fastify.get('/cities/:cityId/infos', async (request, reply) => {
  const cityId = request.params.cityId
  
  try {
    // Get city info
    const cityResponse = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}`)
    if (!cityResponse.ok) return reply.code(404).send({ error: 'City not found' })
    const city = await cityResponse.json()

    // Get weather info
    const weatherResponse = await fetch(`https://api-ugi2pflmha-ew.a.run.app/weather/${city.coordinates[0]}/${city.coordinates[1]}`)
    if (!weatherResponse.ok) throw new Error('Weather API error')
    const weather = await weatherResponse.json()

    // Get city's recipes
    const cityRecipes = Array.from(recipes.values()).filter(r => r.cityId === cityId)

    return {
      coordinates: city.coordinates,
      population: city.population,
      knownFor: city.knownFor,
      weatherPredictions: [
        { when: 'today', min: weather.today.min, max: weather.today.max },
        { when: 'tomorrow', min: weather.tomorrow.min, max: weather.tomorrow.max }
      ],
      recipes: cityRecipes.map(({id, content}) => ({id, content}))
    }
  } catch (err) {
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// POST /cities/:cityId/recipes
fastify.post('/cities/:cityId/recipes', async (request, reply) => {
  const cityId = request.params.cityId
  const { content } = request.body

  if (!content) return reply.code(400).send({ error: 'Content is required' })
  if (content.length < 10) return reply.code(400).send({ error: 'Content too short' })
  if (content.length > 2000) return reply.code(400).send({ error: 'Content too long' })

  try {
    const cityResponse = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}`)
    if (!cityResponse.ok) return reply.code(404).send({ error: 'City not found' })

    const recipe = { id: nextRecipeId++, content, cityId }
    recipes.set(recipe.id, recipe)

    return reply.code(201).send({ id: recipe.id, content: recipe.content })
  } catch (err) {
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// DELETE /cities/:cityId/recipes/:recipeId
fastify.delete('/cities/:cityId/recipes/:recipeId', async (request, reply) => {
  const { cityId, recipeId } = request.params

  try {
    const cityResponse = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}`)
    if (!cityResponse.ok) return reply.code(404).send({ error: 'City not found' })

    const recipe = recipes.get(parseInt(recipeId))
    if (!recipe || recipe.cityId !== cityId) {
      return reply.code(404).send({ error: 'Recipe not found' })
    }

    recipes.delete(parseInt(recipeId))
    return reply.code(204).send()
  } catch (err) {
    reply.code(500).send({ error: 'Internal server error' })
  }
})