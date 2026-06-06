package com.garagefinder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class GarageFinderApplication {
    public static void main(String[] args) {
        SpringApplication.run(GarageFinderApplication.class, args);
    }

    @Bean
    public CommandLineRunner dropUniqueIndex(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Find foreign key constraint name on garages.user_id
                String findFkSql = "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE " +
                        "WHERE TABLE_SCHEMA = 'garagelk_db' AND TABLE_NAME = 'garages' AND COLUMN_NAME = 'user_id' " +
                        "AND REFERENCED_TABLE_NAME = 'users'";
                java.util.List<String> fkNames = jdbcTemplate.queryForList(findFkSql, String.class);
                for (String fkName : fkNames) {
                    try {
                        jdbcTemplate.execute("ALTER TABLE garages DROP FOREIGN KEY " + fkName);
                        System.out.println("DROPPED FOREIGN KEY: " + fkName);
                    } catch (Exception ex) {
                        System.out.println("Could not drop foreign key " + fkName + ": " + ex.getMessage());
                    }
                }

                // Drop unique index
                try {
                    jdbcTemplate.execute("ALTER TABLE garages DROP INDEX UKcgxwe1qapctlxjfwrl9ckpad3");
                    System.out.println("LEGACY UNIQUE INDEX UKcgxwe1qapctlxjfwrl9ckpad3 SUCCESSFULLY DROPPED!");
                } catch (Exception ex) {
                    System.out.println("Could not drop index UKcgxwe1qapctlxjfwrl9ckpad3: " + ex.getMessage());
                }

                // Recreate foreign key as normal relation
                try {
                    jdbcTemplate.execute("ALTER TABLE garages ADD CONSTRAINT FK_user_id FOREIGN KEY (user_id) REFERENCES users(id)");
                    System.out.println("FOREIGN KEY RECREATED SUCCESSFULLY!");
                } catch (Exception ex) {
                    System.out.println("Could not recreate foreign key: " + ex.getMessage());
                }
            } catch (Exception e) {
                System.out.println("Error dropping legacy constraints: " + e.getMessage());
            }
        };
    }
}
