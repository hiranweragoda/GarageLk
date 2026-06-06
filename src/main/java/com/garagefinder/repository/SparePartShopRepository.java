package com.garagefinder.repository;

import com.garagefinder.model.SparePartShop;
import com.garagefinder.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SparePartShopRepository extends JpaRepository<SparePartShop, Long> {
    List<SparePartShop> findByUser(User user);
    List<SparePartShop> findByUserId(Long userId);
    List<SparePartShop> findByStatus(String status);
    List<SparePartShop> findByCityAndStatus(String city, String status);
}
