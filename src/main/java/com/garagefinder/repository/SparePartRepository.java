package com.garagefinder.repository;

import com.garagefinder.model.SparePart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SparePartRepository extends JpaRepository<SparePart, Long> {
    List<SparePart> findByShopId(Long shopId);

    @Query("SELECT sp FROM SparePart sp WHERE sp.shop.status = 'APPROVED' " +
           "AND (:partName IS NULL OR sp.partName LIKE CONCAT('%', :partName, '%')) " +
           "AND (:vehicleModel IS NULL OR sp.vehicleModel LIKE CONCAT('%', :vehicleModel, '%')) " +
           "AND (:vehicleYear IS NULL OR sp.vehicleYear = :vehicleYear) " +
           "AND (:city IS NULL OR sp.shop.city LIKE CONCAT('%', :city, '%'))")
    List<SparePart> searchParts(
        @Param("partName") String partName,
        @Param("vehicleModel") String vehicleModel,
        @Param("vehicleYear") Integer vehicleYear,
        @Param("city") String city
    );
}
