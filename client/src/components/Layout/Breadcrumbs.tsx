import React from 'react';
import Breadcrumb from '../common/Breadcrumb';

type BreadcrumbItem = {
  title: string;
  url?: string;
  active?: boolean;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return <Breadcrumb items={items} />;
};

export default Breadcrumbs;
