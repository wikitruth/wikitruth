import React from 'react';
import { Link } from 'react-router-dom';
import { toModernAppSectionUrl } from '../../utils/paths';

type ApplicationLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

const ApplicationLink: React.FC<ApplicationLinkProps> = ({ href, children, ...props }) => {
  const destination = toModernAppSectionUrl(href);
  if (destination.startsWith('/') && !destination.startsWith('//')) {
    return <Link to={destination} {...props}>{children}</Link>;
  }
  return <a href={destination} {...props}>{children}</a>;
};

export default ApplicationLink;
