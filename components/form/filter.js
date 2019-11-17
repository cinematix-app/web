import { useState } from 'react';
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
} from 'reactstrap';

function Filter({ title, disabled, children }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggle = () => setDropdownOpen(prevState => !prevState);

  return (
    <Dropdown isOpen={dropdownOpen} toggle={toggle} className="form-group">
      <DropdownToggle outline block disabled={disabled} className="text-nowrap" active={dropdownOpen}>{title}</DropdownToggle>
      <DropdownMenu className="p-3">
        {children}
      </DropdownMenu>
    </Dropdown>
  );
}

// @TODO Add default props!

export default Filter;
