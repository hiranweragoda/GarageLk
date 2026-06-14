package com.garagefinder.repository;

import com.garagefinder.model.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MechanicRepository extends JpaRepository<Mechanic, Long> {
    List<Mechanic> findByGarageId(Long garageId);
    List<Mechanic> findByGarageIdAndStatus(Long garageId, String status);
    List<Mechanic> findByGarageIdIn(List<Long> garageIds);
}
