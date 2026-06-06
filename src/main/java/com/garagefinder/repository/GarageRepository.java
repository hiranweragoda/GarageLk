package com.garagefinder.repository;

import com.garagefinder.model.Garage;
import com.garagefinder.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {
    List<Garage> findByUser(User user);
    List<Garage> findByUserId(Long userId);
    List<Garage> findByStatus(String status);
    List<Garage> findByDistrictAndStatus(String district, String status);
    List<Garage> findByCityAndStatus(String city, String status);

    @Query("SELECT DISTINCT g FROM Garage g JOIN OfferedService os ON os.garage.id = g.id WHERE os.serviceType = :serviceType AND g.status = :status")
    List<Garage> findByServiceTypeAndStatus(@Param("serviceType") String serviceType, @Param("status") String status);

    @Query("SELECT g FROM Garage g WHERE g.status = :status AND (g.vehicleTypes IS NULL OR g.vehicleTypes LIKE CONCAT('%', :vehicleType, '%'))")
    List<Garage> findByVehicleTypeAndStatus(@Param("vehicleType") String vehicleType, @Param("status") String status);

    @Query("SELECT g FROM Garage g WHERE g.status = :status AND (g.engineTypes IS NULL OR g.engineTypes LIKE CONCAT('%', :engineType, '%'))")
    List<Garage> findByEngineTypeAndStatus(@Param("engineType") String engineType, @Param("status") String status);

    @Query("SELECT g FROM Garage g WHERE g.status = 'APPROVED' " +
           "AND (:city IS NULL OR g.city LIKE CONCAT('%', :city, '%')) " +
           "AND (:district IS NULL OR g.district = :district) " +
           "AND (:vehicleType IS NULL OR g.vehicleTypes IS NULL OR g.vehicleTypes LIKE CONCAT('%', :vehicleType, '%')) " +
           "AND (:engineType IS NULL OR g.engineTypes IS NULL OR g.engineTypes LIKE CONCAT('%', :engineType, '%'))")
    List<Garage> findWithFilters(
        @Param("city") String city,
        @Param("district") String district,
        @Param("vehicleType") String vehicleType,
        @Param("engineType") String engineType
    );
}
