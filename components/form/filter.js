import { useState } from 'react';
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
} from 'reactstrap';

function Filter({
  title,
  disabled,
  className,
  children,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggle = () => setDropdownOpen(prevState => !prevState);

  return (
    <Dropdown isOpen={disabled === true ? false : dropdownOpen} toggle={toggle} className="form-group">
      <DropdownToggle outline block disabled={disabled} className="text-nowrap" active={dropdownOpen}>{title}</DropdownToggle>
      <DropdownMenu className={className}>
        {children}
      </DropdownMenu>
    </Dropdown>
  );
}

// @TODO Add default props!

export default Filter;
