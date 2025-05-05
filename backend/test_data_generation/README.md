# KernLogic Test Data Generation

This directory contains tools for generating realistic test data for the KernLogic PIM/PDM platform. These tools are designed to help test various features and functionalities of the platform with diverse, realistic product data sets.

## Available Data Generators

- [Car Products](car_products/): Generate and upload 100+ realistic car product entries with comprehensive attributes, images, and more.

## Why Test Data?

Testing a PIM/PDM platform requires comprehensive and diverse product data that exercises all aspects of the system:

1. **Feature Testing**: Test all product fields, attributes, and functionality with realistic data.
2. **Performance Testing**: Measure system performance with real-world product volume and complexity.
3. **UI/UX Testing**: Ensure the user interface handles various data formats and edge cases gracefully.
4. **Integration Testing**: Validate data flow between different system components.
5. **Reporting and Analytics**: Test data visualization and reporting capabilities with meaningful datasets.

## Adding New Data Generators

To add a new test data generator:

1. Create a new subdirectory for your specific product type
2. Implement generator scripts similar to existing ones
3. Update this README to include your new generator

## Common Requirements

Most data generators require:

- Python 3.8+
- Faker library (`pip install faker`)
- Requests library (`pip install requests`)

Some generators may have additional requirements, which are documented in their respective README files. 