# Collapsible Sections Feature Guide

## Overview

The Product Detail page now includes collapsible sections, allowing you to customize your view by expanding or collapsing information panels based on your needs. This feature helps you focus on the most relevant information and reduces page clutter.

## How to Use Collapsible Sections

### Expanding and Collapsing Sections

Each section in the product detail page (like Related Products, Product Description, Attributes, etc.) now has a collapse/expand button at the top right of the section header.

- **To collapse a section**: Click the downward-pointing chevron (↓) next to the section title. The section content will hide, showing only the header.
- **To expand a section**: Click the right-pointing chevron (→) next to the section title. The section content will reappear.

![Collapsible Sections Demo](../assets/images/collapsible-sections-demo.png)

### Benefits

- **Reduced Scrolling**: Collapse sections you're not currently interested in to reduce page length
- **Focus on Relevant Information**: Keep only the most important sections expanded
- **Customizable View**: Tailor the product detail page to your specific workflow
- **Screen Space Optimization**: Particularly useful on smaller screens or when multitasking

### Section State Persistence

Currently, section collapse states **do not** persist between page visits. When you navigate away from a product and return later, all sections will return to their default expanded state.

## Available Collapsible Sections

All major sections in the product detail page support collapsing:

- Product Overview
- Description
- Attributes
- Pricing & Inventory
- Media Gallery
- Related Products
- Categories & Tags
- Variants

## Accessibility Features

The collapsible sections are fully accessible:

- Keyboard navigation support (use Tab to navigate to the section toggle button, and Enter or Space to activate)
- Screen reader announcements when sections are expanded or collapsed
- Proper ARIA attributes for assistive technology

## Feedback

We're constantly improving this feature. If you have suggestions or encounter any issues, please submit feedback through the help center or contact your account manager. 