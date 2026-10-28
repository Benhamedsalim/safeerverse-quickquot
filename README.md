# Safeerverse QuickQuote 🚀

**Créez des Devis, Proformas et Factures professionnels en quelques minutes.**

Safeerverse QuickQuote est une application web gratuite, rapide et sécurisée conçue pour les indépendants, les petites entreprises et les artisans (particulièrement adaptée au marché algérien). Elle permet de générer des documents commerciaux conformes à la réglementation en vigueur, directement depuis votre navigateur, sans aucune inscription requise.

## ✨ Fonctionnalités Principales

*   **3 Types de Documents :**
    *   **Devis** (Offre commerciale avec durée de validité).
    *   **Facture Proforma** (Document préalable à la facturation finale).
    *   **Facture** (Document officiel avec valeur comptable).
*   **Conformité Légale (Algérie) :** Intègre les champs obligatoires (RC, NIF, NIS, Article d'Imposition, RIB/CCP).
*   **Calculs Automatiques :** Gestion du Total HT, des Remises, de la TVA (taux modifiable) et du Total TTC.
*   **Mise en mots :** Écriture automatique du montant total en toutes lettres sur les factures officielles pour éviter toute fraude.
*   **Numérotation Sécurisée :** Système de numérotation séquentielle (ex: `2026/001` pour les factures) avec possibilité de modification manuelle pour éviter les doublons en cas de perte de données.
*   **Personnalisation :** Ajout du logo de votre entreprise sur les documents PDF.
*   **Export PDF :** Téléchargement de documents propres, prêts à être imprimés ou envoyés.
*   **100% Privé (Local-First) :** Aucune base de données cloud. Toutes vos données (clients, montants, historique) sont stockées **uniquement** dans la mémoire de votre navigateur (IndexedDB).

## 🛠️ Stack Technique

*   **Frontend :** HTML5, CSS3, Vanilla JavaScript (Aucun framework lourd pour garantir rapidité et légèreté).
*   **Stockage :** IndexedDB (pour la persistance locale des données).
*   **Génération PDF :** [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable).
*   **Hébergement :** [Netlify](https://www.netlify.com/) (Hébergement statique).
*   **Gestion de version :** Git & GitHub.

## 🚀 Comment l'utiliser en local (Développement)

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/Benhamedsalim/safeerverse-quickquot.git
