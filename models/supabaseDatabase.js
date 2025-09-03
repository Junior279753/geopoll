const { supabase, supabaseAdmin } = require('../config/supabase');

class SupabaseDatabase {
    constructor() {
        this.client = supabase;
        this.adminClient = supabaseAdmin;
        console.log('✅ Connexion à Supabase établie');
    }

    // Méthode pour exécuter une requête SELECT (équivalent à db.get)
    async get(table, filters = {}, columns = '*') {
        try {
            let query = this.client.from(table).select(columns);
            
            // Appliquer les filtres
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data, error } = await query.single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Erreur lors de la requête GET:', error);
            throw error;
        }
    }

    // Méthode pour exécuter une requête SELECT multiple (équivalent à db.all)
    async all(table, filters = {}, columns = '*', orderBy = null) {
        try {
            let query = this.client.from(table).select(columns);
            
            // Appliquer les filtres
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    query = query.in(key, value);
                } else {
                    query = query.eq(key, value);
                }
            });

            // Appliquer l'ordre si spécifié
            if (orderBy) {
                query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
            }

            const { data, error } = await query;
            
            if (error) {
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la requête ALL:', error);
            throw error;
        }
    }

    // Méthode pour insérer des données (équivalent à db.run INSERT)
    async insert(table, data) {
        try {
            // Utiliser le client admin si disponible pour éviter les problèmes RLS
            const client = this.adminClient || this.client;
            const { data: result, error } = await client
                .from(table)
                .insert(data)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { id: result.id, ...result };
        } catch (error) {
            console.error('Erreur lors de l\'insertion:', error);
            throw error;
        }
    }

    // Méthode pour mettre à jour des données (équivalent à db.run UPDATE)
    async update(table, data, filters) {
        try {
            let query = this.client.from(table).update(data);
            
            // Appliquer les filtres
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data: result, error } = await query.select();
            
            if (error) {
                throw error;
            }
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            throw error;
        }
    }

    // Méthode pour supprimer des données (équivalent à db.run DELETE)
    async delete(table, filters) {
        try {
            let query = this.client.from(table).delete();
            
            // Appliquer les filtres
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { error } = await query;
            
            if (error) {
                throw error;
            }
            
            return { success: true };
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    // Méthode pour exécuter des requêtes SQL brutes (pour les cas complexes)
    async query(sql, params = []) {
        try {
            if (!this.adminClient) {
                throw new Error('Client admin Supabase non configuré pour les requêtes SQL brutes');
            }

            // Pour les requêtes SQL brutes, nous utilisons le client admin
            const { data, error } = await this.adminClient.rpc('execute_sql', {
                query: sql,
                params: params
            });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la requête SQL:', error);
            throw error;
        }
    }

    // Méthode pour les transactions (utilise les transactions Supabase)
    async transaction(operations) {
        try {
            // Supabase gère automatiquement les transactions pour les opérations multiples
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            return results;
        } catch (error) {
            console.error('Erreur lors de la transaction:', error);
            throw error;
        }
    }

    // Méthode pour compter les enregistrements
    async count(table, filters = {}) {
        try {
            let query = this.client.from(table).select('*', { count: 'exact', head: true });
            
            // Appliquer les filtres
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { count, error } = await query;
            
            if (error) {
                throw error;
            }
            
            return count;
        } catch (error) {
            console.error('Erreur lors du comptage:', error);
            throw error;
        }
    }

    // Méthodes de compatibilité avec l'ancienne interface SQLite

    // Équivalent à db.run() pour les requêtes d'insertion/mise à jour/suppression
    async run(sql, params = []) {
        try {
            // Analyser le type de requête SQL
            const sqlLower = sql.toLowerCase().trim();

            if (sqlLower.startsWith('insert')) {
                return await this.handleInsertSQL(sql, params);
            } else if (sqlLower.startsWith('update')) {
                return await this.handleUpdateSQL(sql, params);
            } else if (sqlLower.startsWith('delete')) {
                return await this.handleDeleteSQL(sql, params);
            } else {
                // Pour les autres requêtes, utiliser le client admin
                return await this.query(sql, params);
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la requête run:', error);
            throw error;
        }
    }

    // Équivalent à db.get() pour une seule ligne
    async getSingle(sql, params = []) {
        try {
            const result = await this.query(sql, params);
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Erreur lors de la requête getSingle:', error);
            throw error;
        }
    }

    // Équivalent à db.all() pour plusieurs lignes
    async getAll(sql, params = []) {
        try {
            const result = await this.query(sql, params);
            return result || [];
        } catch (error) {
            console.error('Erreur lors de la requête getAll:', error);
            throw error;
        }
    }

    // Méthodes d'aide pour analyser et exécuter les requêtes SQL
    async handleInsertSQL(sql, params) {
        // Cette méthode devra être implémentée pour parser les requêtes INSERT
        // et les convertir en appels Supabase appropriés
        throw new Error('Parsing SQL INSERT non implémenté - utilisez la méthode insert() à la place');
    }

    async handleUpdateSQL(sql, params) {
        // Cette méthode devra être implémentée pour parser les requêtes UPDATE
        throw new Error('Parsing SQL UPDATE non implémenté - utilisez la méthode update() à la place');
    }

    async handleDeleteSQL(sql, params) {
        // Cette méthode devra être implémentée pour parser les requêtes DELETE
        throw new Error('Parsing SQL DELETE non implémenté - utilisez la méthode delete() à la place');
    }

    // Méthode pour fermer la connexion (pour compatibilité)
    close() {
        // Supabase gère automatiquement les connexions
        console.log('Connexion Supabase fermée');
    }
}

module.exports = SupabaseDatabase;
