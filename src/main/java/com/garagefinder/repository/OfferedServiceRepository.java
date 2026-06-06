package com.garagefinder.repository;

import com.garagefinder.model.OfferedService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferedServiceRepository extends JpaRepository<OfferedService, Long> {
    List<OfferedService> findByGarageId(Long garageId);
    Optional<OfferedService> findByGarageIdAndServiceType(Long garageId, String serviceType);

    @Transactional
    void deleteByGarageId(Long garageId);
}
