package com.warehouse.warehouse_system.service;

import com.warehouse.warehouse_system.entity.Product;
import com.warehouse.warehouse_system.entity.Manufacturer;
import com.warehouse.warehouse_system.entity.ProductType;
import com.warehouse.warehouse_system.repository.ProductRepository;
import com.warehouse.warehouse_system.repository.ManufacturerRepository;
import com.warehouse.warehouse_system.repository.ProductTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ManufacturerRepository manufacturerRepository;

    @Autowired
    private ProductTypeRepository productTypeRepository;

    public Page<Product> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable);
    }

    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    public List<Manufacturer> getAllManufacturers() {
        return manufacturerRepository.findAll();
    }

    public List<ProductType> getAllProductTypes() {
        return productTypeRepository.findAll();
    }
}