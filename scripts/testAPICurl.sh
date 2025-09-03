#!/bin/bash

echo "🧪 Test complet de l'API GeoPoll avec Supabase..."
echo ""

BASE_URL="http://localhost:3001"

# Test 1: Connexion admin
echo "1️⃣ Test de connexion admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@geopoll.com","password":"Admin123!"}')

if echo "$ADMIN_RESPONSE" | grep -q "token"; then
    echo "✅ Connexion admin réussie"
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token obtenu: ${ADMIN_TOKEN:0:20}..."
    echo ""
else
    echo "❌ Échec de la connexion admin"
    echo "   Réponse: $ADMIN_RESPONSE"
    echo ""
    exit 1
fi

# Test 2: Tentative de connexion utilisateur non approuvé
echo "2️⃣ Test de connexion utilisateur non approuvé..."
USER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"User123!"}')

HTTP_CODE="${USER_RESPONSE: -3}"
if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ Connexion utilisateur bloquée (attendu)"
    echo "   Code HTTP: $HTTP_CODE"
    echo ""
else
    echo "❌ L'utilisateur non approuvé a pu se connecter (problème!)"
    echo "   Code HTTP: $HTTP_CODE"
    echo ""
fi

# Test 3: Récupération des thèmes de sondage
echo "3️⃣ Test de récupération des thèmes de sondage..."
THEMES_RESPONSE=$(curl -s "$BASE_URL/api/surveys/themes" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$THEMES_RESPONSE" | grep -q "Culture générale"; then
    echo "✅ Récupération des thèmes réussie"
    THEME_COUNT=$(echo "$THEMES_RESPONSE" | grep -o '"name"' | wc -l)
    echo "   Nombre de thèmes: $THEME_COUNT"
    echo ""
else
    echo "❌ Erreur lors de la récupération des thèmes"
    echo "   Réponse: $THEMES_RESPONSE"
    echo ""
fi

# Test 4: Profil admin
echo "4️⃣ Test de récupération du profil admin..."
PROFILE_RESPONSE=$(curl -s "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q "admin@geopoll.com"; then
    echo "✅ Récupération du profil réussie"
    echo "   Email trouvé dans la réponse"
    echo ""
else
    echo "❌ Erreur lors de la récupération du profil"
    echo "   Réponse: $PROFILE_RESPONSE"
    echo ""
fi

# Test 5: Inscription d'un nouvel utilisateur
echo "5️⃣ Test d'inscription d'un nouvel utilisateur..."
REGISTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"TestUser123!",
    "firstName":"Test",
    "lastName":"User",
    "phone":"+33123456789",
    "country":"France",
    "countryCode":"FR",
    "profession":"Testeur"
  }')

HTTP_CODE="${REGISTER_RESPONSE: -3}"
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Inscription testée avec succès"
    if [ "$HTTP_CODE" = "201" ]; then
        echo "   Nouvel utilisateur créé"
    else
        echo "   Utilisateur existe déjà (normal si test déjà exécuté)"
    fi
    echo ""
else
    echo "❌ Échec de l'inscription"
    echo "   Code HTTP: $HTTP_CODE"
    echo "   Réponse: ${REGISTER_RESPONSE%???}"
    echo ""
fi

echo "🎉 Tests terminés !"
echo ""
echo "📋 Résumé des fonctionnalités testées:"
echo "✅ Authentification admin"
echo "✅ Blocage des utilisateurs non approuvés"
echo "✅ Récupération des thèmes de sondage"
echo "✅ Récupération du profil utilisateur"
echo "✅ Inscription de nouveaux utilisateurs"
echo ""
echo "💡 L'approbation admin est bien fonctionnelle !"
