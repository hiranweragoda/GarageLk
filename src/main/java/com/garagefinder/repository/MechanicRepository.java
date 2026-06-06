package com.garagefinder.repository;

import com.garagefinder.model.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MechanicRepository extends JpaRepository<Mechanic, Long> {
    List<Mechanic> findByGarageId(Long garageId);
    List<Mechanic> findByGarageIdAndStatus(Long garageId, String status);
    List<Mechanic> findByGarageIdIn(List<Long> garageIds);
}
